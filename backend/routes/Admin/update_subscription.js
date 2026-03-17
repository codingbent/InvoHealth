const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const fetchuser = require("../../middleware/fetchuser");

router.put("/update_subscription/:id", fetchuser, async (req, res) => {
    try {
        if (req.user.role !== "superadmin") {
            return res.status(403).json({
                success: false,
                error: "Access denied",
            });
        }

        const { plan, billingCycle = "monthly" } = req.body;

        if (!plan) {
            return res.status(400).json({
                success: false,
                error: "Plan is required",
            });
        }

        // calculate expiry
        const startDate = new Date();
        const expiryDate =
            billingCycle === "yearly"
                ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const updated = await Doc.findByIdAndUpdate(
            req.params.id,
            {
                "subscription.plan": plan.toUpperCase(),
                "subscription.billingCycle": billingCycle,
                "subscription.status": "active",
                "subscription.startDate": startDate,
                "subscription.expiryDate": expiryDate,

                // reset usage limits when plan changes
                "usage.excelExports": 0,
                "usage.invoiceDownloads": 0,
            },
            { new: true },
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        res.json({
            success: true,
            message: "Subscription updated successfully",
            doctor: updated,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
