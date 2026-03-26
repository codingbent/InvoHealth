const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const checkSubscription = require("../../utils/subscription_check");
var fetchuser = require("../../middleware/fetchuser");

router.get("/subscription", fetchuser, async (req, res) => {
    try {
        const doctor = await Doc.findById(req.user.doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        await checkSubscription(doctor);

        const updatedSub = doctor.subscription || {};

        // DAYS REMAINING
        let daysRemaining = 0;

        const normalizeDate = (d) => {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            return date;
        };
        if (updatedSub.expiryDate) {
            const today = normalizeDate(new Date());
            const expiry = normalizeDate(updatedSub.expiryDate);

            const diff = expiry - today;

            daysRemaining =
                updatedSub.status === "expired"
                    ? 0
                    : Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        }

        return res.json({
            success: true,
            subscription: {
                plan: updatedSub.plan || "FREE",
                status:
                    updatedSub.status === "trial"
                        ? "active"
                        : updatedSub.status,
                billingCycle: updatedSub.billingCycle || "monthly",
                startDate: updatedSub.startDate,
                expiryDate: updatedSub.expiryDate,
                daysRemaining,
                paymentId: updatedSub.paymentId || "-",
                orderId: updatedSub.orderId || "-",
                amountPaid: updatedSub.amountPaid || 0,
                currency: updatedSub.currency || "INR",
            },
            usage: doctor.usage,
            joinedAt: doctor.createdAt,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
