const express = require("express");
const router = express.Router();
const axios = require("axios");
const razorpay = require("../config/razorpay");
const { getPayPalAccessToken } = require("../config/paypal");
const fetchuser = require("../../middleware/fetchuser");
const Doc = require("../../models/Doc");
const Pricing = require("../../models/Pricing");
const PLAN_IDS = require("../config/plan_ids");

// ─────────────────────────────────────────────────────────────────────────────
// Route 1: RAZORPAY — India / INR only
// POST /api/payment/create-subscription
// ─────────────────────────────────────────────────────────────────────────────
router.post("/create-subscription", fetchuser, async (req, res) => {
    try {
        const { plan, billing, currency } = req.body;

        if (!plan || !billing)
            return res
                .status(400)
                .json({ success: false, error: "Plan and billing required" });

        if (!["monthly", "yearly"].includes(billing))
            return res
                .status(400)
                .json({ success: false, error: "Invalid billing cycle" });

        // Hard-block non-INR — this endpoint is Razorpay-only
        if (currency !== "INR")
            return res.status(400).json({
                success: false,
                error: "This endpoint only supports INR payments",
            });

        const normalizedPlan = plan.toLowerCase();
        const plans = PLAN_IDS[normalizedPlan];
        if (!plans)
            return res
                .status(400)
                .json({ success: false, error: "Invalid plan" });

        const planId = plans[billing];
        if (!planId)
            return res.status(500).json({
                success: false,
                error: "Plan ID not configured. Contact support.",
            });

        // ── Fetch doctor ──
        const doc = await Doc.findById(req.user.doctorId);
        if (!doc)
            return res
                .status(404)
                .json({ success: false, error: "Doctor not found" });

        // ── Create or reuse Razorpay customer ──
        let customerId = doc.subscription?.customerId;

        if (!customerId) {
            try {
                const customer = await razorpay.customers.create({
                    name: doc.name || "Doctor",
                    email: doc.email || "noreply@example.com",
                });
                customerId = customer.id;
            } catch (err) {
                if (
                    err.error?.description ===
                    "Customer already exists for the merchant"
                ) {
                    const customers = await razorpay.customers.all({
                        email: doc.email,
                    });
                    customerId = customers.items?.[0]?.id;
                } else {
                    throw err;
                }
            }

            await Doc.findByIdAndUpdate(req.user.doctorId, {
                "subscription.customerId": customerId,
            });
        }

        // ── Create Razorpay subscription ──
        // total_count: yearly = 1 charge, monthly = 12 charges (auto-renews 12×)
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_id: customerId,
            customer_notify: 1,
            total_count: billing === "yearly" ? 1 : 12,
        });

        return res.json({ success: true, subscription });
    } catch (err) {
        console.error("RAZORPAY CREATE-SUBSCRIPTION ERROR:", err);
        return res.status(500).json({
            success: false,
            error: err.error?.description || err.message || "Server error",
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Route 2: PAYPAL ORDER — International (any non-INR currency)
// POST /api/payment/create-paypal-order
//
// Flow:
//   1. Frontend calls this → gets { orderID }
//   2. Frontend opens PayPal checkout with that orderID
//   3. User approves → PayPal calls onApprove(data) in frontend
//   4. Frontend calls /paypal-capture-order with { orderID, plan, billing }
//   5. Backend captures and activates subscription
// ─────────────────────────────────────────────────────────────────────────────
router.post("/create-paypal-order", fetchuser, async (req, res) => {
    try {
        const { plan, billing, currency } = req.body;

        // ── Validation ──
        if (!plan || !billing || !currency)
            return res.status(400).json({
                success: false,
                error: "plan, billing and currency are required",
            });

        if (!["monthly", "yearly"].includes(billing))
            return res
                .status(400)
                .json({ success: false, error: "Invalid billing cycle" });

        // Block INR — use Razorpay for India
        if (currency === "INR")
            return res.status(400).json({
                success: false,
                error: "INR payments must use Razorpay",
            });

        const normalizedPlan = plan.toLowerCase();
        if (!["starter", "pro", "enterprise"].includes(normalizedPlan))
            return res
                .status(400)
                .json({ success: false, error: "Invalid plan" });

        // ── Fetch pricing from DB (never trust frontend price) ──
        const pricing = await Pricing.findOne().lean();
        const planData = pricing?.[normalizedPlan];
        if (!planData)
            return res.status(500).json({
                success: false,
                error: "Pricing not configured",
            });

        // ── Calculate amount in INR, then convert ──
        // Pricing DB stores values in INR. Frontend sends the currency and
        // we need the country's exchange rate to compute the final amount.
        // We fetch the Country doc to get the rate — same source of truth as
        // the Pricing page frontend uses.
        const Country = require("../../models/Country");
        const countryDoc = await Country.findOne({ currency }).lean();
        if (!countryDoc)
            return res.status(400).json({
                success: false,
                error: `Currency "${currency}" is not supported`,
            });

        const rate = countryDoc.rate || 1;
        const multiplier = countryDoc.multiplier || 1;
        const discount = pricing.discount || 0;

        // Monthly in local currency
        const monthlyINR = planData.monthly * multiplier;
        const monthlyLocal = monthlyINR / rate;

        // Yearly applies the discount
        const yearlyLocal = (monthlyINR * 12 * (1 - discount / 100)) / rate;

        const amount =
            billing === "yearly"
                ? Math.round(yearlyLocal * 100) / 100 // 2 decimal places
                : Math.round(monthlyLocal * 100) / 100;

        // ── Create PayPal order ──
        const { token, base } = await getPayPalAccessToken();

        const orderRes = await axios.post(
            `${base}/v2/checkout/orders`,
            {
                intent: "CAPTURE",
                purchase_units: [
                    {
                        // Store plan+billing in description for audit trail
                        description: `${normalizedPlan.toUpperCase()} ${billing} plan`,
                        // custom_id is passed through to capture and webhook — useful for reconciliation
                        custom_id: `${req.user.doctorId}|${normalizedPlan}|${billing}`,
                        amount: {
                            currency_code: currency,
                            value: amount.toFixed(2),
                        },
                    },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            },
        );

        return res.json({
            success: true,
            orderID: orderRes.data.id,
            // Return computed amount so frontend can show exact price (no recalculation needed)
            amount: amount.toFixed(2),
            currency,
        });
    } catch (err) {
        console.error(
            "PAYPAL CREATE ORDER ERROR:",
            err.response?.data || err.message,
        );
        return res.status(500).json({
            success: false,
            error: "Failed to create PayPal order",
        });
    }
});

module.exports = router;
