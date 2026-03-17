const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
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

        let subscription = doctor.subscription || {};

        // ✅ CHECK EXPIRY
        if (
            subscription.expiryDate &&
            new Date(subscription.expiryDate) < new Date() &&
            subscription.status === "active"
        ) {
            // ✅ KEEP SAME PLAN
            doctor.subscription.status = "expired";

            // ✅ RESET USAGE
            doctor.usage = {
                excelExports: 0,
                invoiceDownloads: 0,
            };

            await doctor.save();

            subscription = doctor.subscription;
        }

        let daysRemaining = null;

        if (subscription.expiryDate) {
            const diff = new Date(subscription.expiryDate) - new Date();
            daysRemaining = Math.max(
                0,
                Math.ceil(diff / (1000 * 60 * 60 * 24)),
            );
        }

        res.json({
            success: true,
            subscription: {
                plan: subscription.plan || "FREE", // stays same
                status: subscription.status || "active",
                billingCycle: subscription.billingCycle || "monthly",
                startDate: subscription.startDate,
                expiryDate: subscription.expiryDate,
                daysRemaining,
                paymentId: subscription.paymentId || "-",
                orderId: subscription.orderId || "-",
                amountPaid: subscription.amountPaid || 0,
                currency: subscription.currency || "INR",
            },
            usage: doctor.usage,
            joinedAt: doctor.createdAt,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
