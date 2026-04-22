const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const fetchadmin = require("../../middleware/fetchadmin");

router.put("/update_subscription/:id", fetchadmin, async (req, res) => {
    try {
        if (req.admin.role !== "superadmin") {
            return res.status(403).json({
                success: false,
                error: "Access denied",
            });
        }

        const { plan, billingCycle = "monthly", months = 1 } = req.body;

        if (!plan) {
            return res.status(400).json({
                success: false,
                error: "Plan is required",
            });
        }

        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + months);

        const updated = await Doc.findByIdAndUpdate(
            req.params.id,
            {
                "subscription.plan": plan.toUpperCase(),
                "subscription.billingCycle": billingCycle,
                // FIX: Use "active" directly — never "trial".
                //
                // WHY: getSubscriptionStatus() in subscription_check.js determines
                // status purely from expiryDate math (expiry > today → "active").
                // It ignores the DB status field entirely. So the DB status field
                // is only used for display purposes in the /subscription endpoint.
                //
                // If we store "trial" here, the DB and API disagree:
                //   - DB says: "trial"
                //   - /subscription endpoint says: "active" (translates trial → active)
                //   - All guards say: "active" (from date math, ignores DB status)
                //
                // That silent translation (subscription.js line 55) is confusing and
                // fragile. We normalize to "active" at the source so the DB, API,
                // and all middleware always agree on the same value.
                "subscription.status": "active",
                "subscription.startDate": new Date(),
                "subscription.expiryDate": expiryDate,
                "usage.excelExports": 0,
                "usage.invoiceDownloads": 0,
                "usage.imageUploads": 0,
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
            message: `Subscription updated to ${plan.toUpperCase()} (${billingCycle}) for ${months} month(s)`,
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
