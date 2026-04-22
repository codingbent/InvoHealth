const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const axios = require("axios");
const fetchuser = require("../../middleware/fetchuser");
const Doc = require("../../models/Doc");
const { getPricing } = require("../../utils/pricingcache");
const Payment = require("../../models/Payment");
const { getPayPalAccessToken } = require("../config/paypal");
const razorpay = require("../config/razorpay");

// ─── Rate limiters ───────────────────────────────────────────────────────────
const rateLimit = require("express-rate-limit");

const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { success: false, error: "Too many requests. Please wait." },
});

const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { success: false, error: "Too many webhook calls." },
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Capture a PayPal order and return the capture details */
async function capturePayPalOrder(orderID) {
    const { token, base } = await getPayPalAccessToken();
    const res = await axios.post(
        `${base}/v2/checkout/orders/${orderID}/capture`,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        },
    );
    return { data: res.data, base, token };
}

/** Verify PayPal webhook signature against PayPal's API */
async function verifyPayPalWebhookSignature(req) {
    const { token, base } = await getPayPalAccessToken();

    const payload = {
        auth_algo: req.headers["paypal-auth-algo"],
        cert_url: req.headers["paypal-cert-url"],
        transmission_id: req.headers["paypal-transmission-id"],
        transmission_sig: req.headers["paypal-transmission-sig"],
        transmission_time: req.headers["paypal-transmission-time"],
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(req.body.toString()),
    };

    const res = await axios.post(
        `${base}/v1/notifications/verify-webhook-signature`,
        payload,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        },
    );

    return res.data.verification_status === "SUCCESS";
}

function computeExpiryDate(from, billing) {
    const expiry = new Date(from);
    if (billing === "yearly") {
        const year = expiry.getFullYear();
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        expiry.setDate(expiry.getDate() + (isLeap ? 366 : 365));
    } else {
        expiry.setDate(expiry.getDate() + 30);
    }
    return expiry;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route 1: RAZORPAY /verify-payment
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-payment", paymentLimiter, fetchuser, async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_subscription_id,
            razorpay_order_id,
            razorpay_signature,
            plan,
            currency = "INR",
        } = req.body;

        // ── Validation ──
        if (!plan)
            return res
                .status(400)
                .json({ success: false, error: "Plan missing" });

        const normalizedPlan = plan.toLowerCase();
        if (!["starter", "pro", "enterprise"].includes(normalizedPlan))
            return res
                .status(400)
                .json({ success: false, error: "Invalid plan" });

        if (!razorpay_payment_id || !razorpay_signature)
            return res
                .status(400)
                .json({ success: false, error: "Missing payment data" });

        // ── Signature verification ──
        let sigBody;
        if (razorpay_subscription_id)
            sigBody = `${razorpay_payment_id}|${razorpay_subscription_id}`;
        else if (razorpay_order_id)
            sigBody = `${razorpay_order_id}|${razorpay_payment_id}`;
        else
            return res
                .status(400)
                .json({ success: false, error: "Missing payment identifiers" });

        const expectedSig = crypto
            .createHmac("sha256", process.env.Razor_Pay_Key_Secret)
            .update(sigBody)
            .digest("hex");

        if (expectedSig !== razorpay_signature)
            return res
                .status(400)
                .json({ success: false, error: "Invalid signature" });

        // ── Idempotency ──
        const now = new Date();
        const existing = await Payment.findOne({
            paymentId: razorpay_payment_id,
        });
        if (existing)
            return res.json({ success: true, message: "Already processed" });

        // ── Fetch pricing ──
        const pricing = await getPricing();
        const planData = pricing?.[normalizedPlan];
        if (!planData)
            return res
                .status(400)
                .json({ success: false, error: "Invalid pricing config" });

        const discount = pricing.discount || 0;
        const order = await razorpay.orders.fetch(razorpay_order_id);

        // ── Derive billing from Razorpay API (never trust client) ──
        let billing;
        if (razorpay_subscription_id) {
            const sub = await razorpay.subscriptions.fetch(
                razorpay_subscription_id,
            );
            const pid = sub.plan_id.toLowerCase();
            billing = pid.includes("year") ? "yearly" : "monthly";
        } else if (razorpay_order_id) {
            billing = order.notes?.billing;
            if (!billing)
                return res.status(400).json({
                    success: false,
                    error: "Billing not found in order notes",
                });
        }

        // ── Amount validation (anti-fraud) ──
        const expectedAmountINR =
            billing === "yearly"
                ? Math.round(planData.monthly * 12 * (1 - discount / 100) * 100)
                : Math.round(planData.monthly * 100);

        if (razorpay_order_id) {
            if (order.amount !== expectedAmountINR)
                return res
                    .status(400)
                    .json({ success: false, error: "Amount mismatch" });
        }

        // ── Fetch doctor ──
        const doc = await Doc.findById(req.user.doctorId);
        if (!doc)
            return res
                .status(404)
                .json({ success: false, error: "User not found" });

        const expiryDate = computeExpiryDate(now, billing);

        // ── Write payment record ──
        await Payment.create({
            doctorId: req.user.doctorId,
            plan: normalizedPlan.toUpperCase(),
            billingCycle: billing,
            paymentId: razorpay_payment_id,
            subscriptionId: razorpay_subscription_id || null,
            orderId: razorpay_order_id || null,
            currency,
            amountPaid: expectedAmountINR / 100,
            status: "success",
            paymentMethod: "razorpay",
            paidAt: now,
        });

        // ── Activate subscription ──
        await Doc.findByIdAndUpdate(req.user.doctorId, {
            "subscription.plan": normalizedPlan.toUpperCase(),
            "subscription.billingCycle": billing,
            "subscription.status": "active",
            "subscription.startDate": now,
            "subscription.expiryDate": expiryDate,
            "subscription.subscriptionId": razorpay_subscription_id || null,
            "subscription.paymentId": razorpay_payment_id,
            "subscription.orderId": razorpay_order_id || null,
            "subscription.amountPaid": expectedAmountINR / 100,
            "subscription.currency": currency,
            "subscription.paymentMethod": "razorpay",
            "usage.excelExports": 0,
            "usage.invoiceDownloads": 0,
            "usage.imageUploads": 0,
        });

        console.log(
            `[Razorpay] Payment verified: ${razorpay_payment_id} | Doctor: ${req.user.doctorId} | Plan: ${normalizedPlan} ${billing}`,
        );

        return res.json({
            success: true,
            message: "Payment verified successfully",
        });
    } catch (error) {
        if (error.code === 11000)
            return res.json({ success: true, message: "Already processed" });

        console.error("Razorpay verify-payment error:", error);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

router.post(
    "/paypal-capture-order",
    paymentLimiter,
    fetchuser,
    async (req, res) => {
        try {
            const { orderID, plan, billing, currency } = req.body;

            // ── Validation ──
            if (!orderID || !plan || !billing || !currency)
                return res.status(400).json({
                    success: false,
                    error: "orderID, plan, billing and currency are required",
                });

            const normalizedPlan = plan.toLowerCase();
            if (!["starter", "pro", "enterprise"].includes(normalizedPlan))
                return res
                    .status(400)
                    .json({ success: false, error: "Invalid plan" });

            if (!["monthly", "yearly"].includes(billing))
                return res
                    .status(400)
                    .json({ success: false, error: "Invalid billing cycle" });

            // ── Capture the PayPal order ──
            let captureData;
            try {
                const result = await capturePayPalOrder(orderID);
                captureData = result.data;
            } catch (err) {
                const paypalErr = err?.response?.data;
                console.error(
                    "PayPal capture failed:",
                    paypalErr || err.message,
                );

                // ORDER_ALREADY_CAPTURED means PayPal already processed this —
                // check if we have a Payment record for it (webhook may have beat us).
                if (paypalErr?.name === "ORDER_ALREADY_CAPTURED") {
                    const existing = await Payment.findOne({
                        orderId: orderID,
                    });
                    if (existing) {
                        console.log(
                            "[PayPal] Already captured and recorded, returning success:",
                            orderID,
                        );
                        return res.json({
                            success: true,
                            message: "Already processed",
                        });
                    }
                    // Captured by PayPal but not in our DB — fall through with
                    // captureData = undefined; the status check below will catch it.
                    console.warn(
                        "[PayPal] Order already captured but no Payment record found:",
                        orderID,
                    );
                }

                if (!captureData) {
                    return res.status(502).json({
                        success: false,
                        error: "Payment capture failed. You have not been charged. Please try again.",
                    });
                }
            }

            // ── Verify capture status ──
            if (!captureData || captureData.status !== "COMPLETED") {
                console.error(
                    "[PayPal] Capture status not COMPLETED:",
                    captureData?.status,
                    orderID,
                );
                return res.status(400).json({
                    success: false,
                    error: `Payment status is "${captureData?.status ?? "unknown"}". Contact support if you were charged. Order ID: ${orderID}`,
                });
            }

            // ── Extract capture details ──
            // Amount and currency come from PayPal's response — never from the client.
            const captureUnit = captureData?.purchase_units?.[0];
            const capture = captureUnit?.payments?.captures?.[0];
            const capturedAmount = parseFloat(capture?.amount?.value || 0);
            const capturedCurrency = capture?.amount?.currency_code || currency;

            // ── Cross-check amount vs DB pricing (anti-fraud) ──
            const pricing = await getPricing();
            const planData = pricing?.[normalizedPlan];
            if (!planData)
                return res.status(500).json({
                    success: false,
                    error: "Pricing not configured",
                });

            const Country = require("../../models/Country");
            const countryDoc = await Country.findOne({
                currency: capturedCurrency,
            }).lean();

            if (countryDoc) {
                const rate = countryDoc.rate || 1;
                const multiplier = countryDoc.multiplier || 1;
                const discount = pricing.discount || 0;

                const monthlyLocal = (planData.monthly * multiplier) / rate;
                const yearlyLocal =
                    (planData.monthly *
                        multiplier *
                        12 *
                        (1 - discount / 100)) /
                    rate;

                const expectedAmount =
                    billing === "yearly"
                        ? Math.round(yearlyLocal * 100) / 100
                        : Math.round(monthlyLocal * 100) / 100;

                // Allow ±0.10 tolerance for floating point / currency rounding
                if (Math.abs(capturedAmount - expectedAmount) > 0.1) {
                    console.error("[PayPal] Amount mismatch:", {
                        captured: capturedAmount,
                        expected: expectedAmount,
                        plan: normalizedPlan,
                        billing,
                        currency: capturedCurrency,
                    });
                    return res.status(400).json({
                        success: false,
                        error:
                            "Payment amount mismatch. Contact support with Order ID: " +
                            orderID,
                    });
                }
            }

            // ── Fetch doctor ──
            const doc = await Doc.findById(req.user.doctorId);
            if (!doc)
                return res
                    .status(404)
                    .json({ success: false, error: "User not found" });

            const now = new Date();
            const expiryDate = computeExpiryDate(now, billing);

            try {
                await Payment.create({
                    doctorId: req.user.doctorId,
                    plan: normalizedPlan.toUpperCase(),
                    billingCycle: billing,
                    orderId: orderID,
                    subscriptionId: capture?.id || null, // PayPal capture ID as reference
                    currency: capturedCurrency,
                    amountPaid: capturedAmount,
                    status: "success",
                    paymentMethod: "paypal",
                    paidAt: now,
                });
            } catch (dbErr) {
                if (dbErr.code === 11000) {
                    console.log(
                        "[PayPal] Duplicate Payment.create blocked by unique index, returning success:",
                        orderID,
                    );
                    return res.json({
                        success: true,
                        message: "Already processed",
                    });
                }
                throw dbErr; // unexpected DB error — re-throw to outer catch
            }

            // ── Activate subscription ──
            await Doc.findByIdAndUpdate(req.user.doctorId, {
                "subscription.plan": normalizedPlan.toUpperCase(),
                "subscription.billingCycle": billing,
                "subscription.status": "active",
                "subscription.startDate": now,
                "subscription.expiryDate": expiryDate,
                "subscription.orderId": orderID,
                "subscription.subscriptionId": capture?.id || null,
                "subscription.paymentId": null,
                "subscription.amountPaid": capturedAmount,
                "subscription.currency": capturedCurrency,
                "subscription.paymentMethod": "paypal",
                "usage.excelExports": 0,
                "usage.invoiceDownloads": 0,
                "usage.imageUploads": 0,
            });

            console.log(
                `[PayPal] Order captured & activated: ${orderID} | Doctor: ${req.user.doctorId} | Plan: ${normalizedPlan} ${billing} | Amount: ${capturedAmount} ${capturedCurrency}`,
            );

            return res.json({
                success: true,
                message:
                    "Payment captured and subscription activated successfully",
            });
        } catch (error) {
            console.error("paypal-capture-order error:", error);
            return res.status(500).json({
                success: false,
                error: "Server error during payment capture. Contact support if you were charged.",
            });
        }
    },
);

router.post("/paypal-webhook", webhookLimiter, async (req, res) => {
    try {
        let verified = false;
        try {
            verified = await verifyPayPalWebhookSignature(req);
        } catch (sigErr) {
            // Log the actual error so it's easy to debug config issues
            console.error(
                "[PayPal Webhook] Signature verification error — check PAYPAL_WEBHOOK_ID and PAYPAL_MODE env vars:",
                sigErr?.response?.data || sigErr.message,
            );
            // Hard reject — do NOT bypass in any environment
            return res
                .status(400)
                .send("Webhook signature verification failed");
        }

        if (!verified) {
            console.warn("[PayPal Webhook] Signature invalid — rejecting");
            return res.status(400).send("Invalid webhook signature");
        }

        const event = JSON.parse(req.body.toString());
        console.log("[PayPal Webhook]", event.event_type, event.resource?.id);

        // Respond 200 immediately — PayPal retries if no fast response
        res.status(200).send("OK");

        // ── Process event asynchronously ──
        const resource = event.resource || {};

        switch (event.event_type) {
            // Safety net: if frontend capture call failed but PayPal still captured it
            case "PAYMENT.CAPTURE.COMPLETED": {
                const orderID =
                    resource.supplementary_data?.related_ids?.order_id;
                if (!orderID) break;

                // Already processed by /paypal-capture-order? Skip.
                const already = await Payment.findOne({ orderId: orderID });
                if (already) break;

                // Find doctor via custom_id stored in the order (doctorId|plan|billing)
                const customId = resource.custom_id || "";
                const [doctorId, planRaw, billing] = customId.split("|");
                if (!doctorId || !planRaw || !billing) {
                    console.warn(
                        "[PayPal Webhook] CAPTURE.COMPLETED — missing custom_id:",
                        customId,
                    );
                    break;
                }

                const capturedAmount = parseFloat(resource.amount?.value || 0);
                const capturedCurrency =
                    resource.amount?.currency_code || "USD";
                const now = new Date();
                const expiryDate = computeExpiryDate(now, billing);
                const normalizedPlan = planRaw.toLowerCase();

                await Payment.create({
                    doctorId,
                    plan: normalizedPlan.toUpperCase(),
                    billingCycle: billing,
                    orderId: orderID,
                    subscriptionId: resource.id,
                    currency: capturedCurrency,
                    amountPaid: capturedAmount,
                    status: "success",
                    paymentMethod: "paypal",
                    webhookEventId: event.id,
                    paidAt: now,
                }).catch((err) => {
                    if (err.code !== 11000)
                        console.error("Webhook Payment.create error:", err);
                });

                await Doc.findByIdAndUpdate(doctorId, {
                    "subscription.plan": normalizedPlan.toUpperCase(),
                    "subscription.billingCycle": billing,
                    "subscription.status": "active",
                    "subscription.startDate": now,
                    "subscription.expiryDate": expiryDate,
                    "subscription.orderId": orderID,
                    "subscription.amountPaid": capturedAmount,
                    "subscription.currency": capturedCurrency,
                    "subscription.paymentMethod": "paypal",
                    "usage.excelExports": 0,
                    "usage.invoiceDownloads": 0,
                    "usage.imageUploads": 0,
                });

                console.log(
                    "[PayPal Webhook] Fallback capture activated for doctor:",
                    doctorId,
                );
                break;
            }

            // Refund → expire the subscription
            case "PAYMENT.CAPTURE.REFUNDED": {
                const orderID =
                    resource.supplementary_data?.related_ids?.order_id;
                if (!orderID) break;
                await Doc.findOneAndUpdate(
                    { "subscription.orderId": orderID },
                    { "subscription.status": "expired" },
                );
                await Payment.findOneAndUpdate(
                    { orderId: orderID },
                    { status: "refunded" },
                );
                console.log(
                    "[PayPal Webhook] Refund processed for order:",
                    orderID,
                );
                break;
            }

            // Denied capture → log it
            case "PAYMENT.CAPTURE.DENIED": {
                const orderID =
                    resource.supplementary_data?.related_ids?.order_id;

                console.warn(
                    "[PayPal Webhook] Capture denied for order:",
                    orderID,
                );

                if (orderID) {
                    // 1. Update payment
                    await Payment.findOneAndUpdate(
                        { orderId: orderID },
                        { status: "failed" },
                    );

                    // 2. FIX: Update subscription state
                    await Doc.findOneAndUpdate(
                        { "subscription.orderId": orderID },
                        {
                            "subscription.status": "failed",
                        },
                    );
                }

                break;
            }

            default:
                console.log(
                    "[PayPal Webhook] Unhandled event:",
                    event.event_type,
                );
        }
    } catch (err) {
        console.error("PayPal webhook processing error:", err);
        // 200 already sent — just log
    }
});

module.exports = router;
