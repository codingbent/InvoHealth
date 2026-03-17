const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const fetchuser = require("../../middleware/fetchuser");
const Doc = require("../../models/Doc");
const Pricing = require("../../models/Pricing");
const Payment = require("../../models/Payment");

router.post("/verify-payment", fetchuser, async (req, res) => {
    try {
        let {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            plan,
            billing,
        } = req.body;

        if (!plan) {
            return res.status(400).json({
                success: false,
                error: "Plan missing",
            });
        }

        plan = plan.toLowerCase();

        if (!billing) {
            billing = "monthly";
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.Razor_Pay_Key_Secret)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                error: "Payment verification failed",
            });
        }

        const pricing = await Pricing.findOne();

        if (!pricing || !pricing[plan]) {
            return res.status(500).json({
                success: false,
                error: "Pricing configuration missing",
            });
        }

        const planData = pricing[plan];

        const amount =
            billing === "monthly" ? planData.monthly : planData.yearly;

        let expiryDate;

        if (billing === "monthly") {
            expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else {
            expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        }

        // Update subscription
        await Doc.findByIdAndUpdate(req.user.doctorId, {
            "subscription.plan": plan.toUpperCase(),
            "subscription.billingCycle": billing,
            "subscription.status": "active",
            "subscription.startDate": new Date(),
            "subscription.expiryDate": expiryDate,
            "subscription.paymentId": razorpay_payment_id,
            "subscription.orderId": razorpay_order_id,
            "subscription.amountPaid": amount,
            "subscription.currency": "INR",
            "usage.excelExports": 0,
            "usage.invoiceDownloads": 0,
        });

        await Payment.create({
            doctorId: req.user.doctorId,
            plan: plan.toUpperCase(),
            billingCycle: billing,
            amountPaid: amount,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            currency: "INR",
            paidAt: new Date(),
        });

        return res.json({
            success: true,
        });
    } catch (error) {
        console.error("Verify payment error:", error);

        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
