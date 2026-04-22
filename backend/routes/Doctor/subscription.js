const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const fetchuser = require("../../middleware/fetchuser");
const {
    getSubscriptionStatus,
    normalizeDate,
} = require("../../utils/subscription_check");

router.get("/subscription", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId || req.user.id;

        const doctor = await Doc.findById(doctorId)
            .populate("address.countryId")
            .populate("subscription.currencyId")
            .lean();

        if (!doctor)
            return res
                .status(404)
                .json({ success: false, error: "Doctor not found" });

        const sub = doctor.subscription || {};

        const computedStatus = getSubscriptionStatus(sub);

        // Resolve currency: subscription record first, fall back to address country
        const country = doctor.address?.countryId;
        const subCurrency = sub.currencyId;
        const currency =
            sub.currency || subCurrency?.currency || country?.currency || "INR";
        const currencySymbol = subCurrency?.symbol || country?.symbol || "₹";

        // Days remaining
        let daysRemaining = 0;
        if (sub.expiryDate && !isNaN(new Date(sub.expiryDate))) {
            const today = normalizeDate(new Date());
            const expiry = normalizeDate(sub.expiryDate);
            const diff = expiry - today;
            daysRemaining =
                computedStatus === "expired"
                    ? 0
                    : Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        return res.json({
            success: true,
            subscription: {
                plan: sub.plan || "",
                // FIX: No longer translating "trial" → "active" here.
                // update_subscription.js now stores "active" directly, and
                // create_doctor.js is the only place "trial" is written (new signups).
                // getSubscriptionStatus() already handles new signups correctly
                // because it checks expiryDate, not the status string.
                status: computedStatus,
                billingCycle: sub.billingCycle || "monthly",
                startDate: sub.startDate,
                expiryDate: sub.expiryDate,
                daysRemaining,
                paymentId: sub.paymentId || "-",
                orderId: sub.orderId || "-",
                amountPaid: sub.amountPaid || 0,
                currency,
                currencySymbol,
                exchangeRate: sub.exchangeRate || null,
                baseAmount: sub.baseAmount || null,
                paymentMethod: sub.paymentMethod || null,
            },
            usage: doctor.usage,
            joinedAt: doctor.createdAt,
        });
    } catch (error) {
        console.error("subscription route error:", error);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
