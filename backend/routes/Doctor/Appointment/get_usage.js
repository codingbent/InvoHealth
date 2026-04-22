const express = require("express");
const router = express.Router();
const Doc = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const { getPricing,invalidatePricingCache } = require("../../../utils/pricingcache");


router.get("/get_usage", fetchuser, async (req, res) => {
    try {
        const doctor = await Doc.findById(req.user.doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const pricing = await getPricing();

        if (!pricing) {
            return res.status(500).json({
                success: false,
                error: "Pricing config missing",
            });
        }

        const plan = doctor.subscription?.plan?.toLowerCase() || "starter";
        const planData = pricing[plan];

        if (!planData) {
            return res.status(400).json({
                success: false,
                error: "Invalid subscription plan",
            });
        }

        // USAGE
        const usage = {
            images: {
                used: doctor.usage?.imageUploads || 0,
                limit: planData.imageLimit ?? 0,
            },
            invoices: {
                used: doctor.usage?.invoiceDownloads || 0,
                limit: planData.invoiceLimit ?? 0,
            },
            exports: {
                used: doctor.usage?.excelExports || 0,
                limit: planData.excelLimit ?? 0,
            },
        };

        // Add remaining + unlimited handling
        const formatUsage = (item) => ({
            used: item.used,
            limit: item.limit,
            remaining:
                item.limit === -1 ? -1 : Math.max(item.limit - item.used, 0),
            isLimitReached: item.limit !== -1 && item.used >= item.limit,
        });

        return res.json({
            success: true,
            plan,
            usage: {
                images: formatUsage(usage.images),
                invoices: formatUsage(usage.invoices),
                exports: formatUsage(usage.exports),
            },
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
