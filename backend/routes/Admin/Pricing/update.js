const express = require("express");
const router = express.Router();
const fetchadmin = require("../../../middleware/fetchadmin");
const Pricing = require("../../../models/Pricing");

router.post("/pricing/update", fetchadmin, async (req, res) => {
    try {
        const { starter, pro, enterprise } = req.body;

        // Validate payload
        if (!starter || !pro || !enterprise) {
            return res.status(400).json({
                success: false,
                error: "Invalid pricing payload",
            });
        }

        const pricingData = {
            starter: {
                monthly: starter.monthly,
                yearly: starter.yearly,
                staffLimit: starter.staffLimit,
                excelLimit: starter.excelLimit,
                invoiceLimit: starter.invoiceLimit,
                analytics: starter.analytics,
            },
            pro: {
                monthly: pro.monthly,
                yearly: pro.yearly,
                staffLimit: pro.staffLimit,
                excelLimit: pro.excelLimit,
                invoiceLimit: pro.invoiceLimit,
                analytics: pro.analytics,
            },
            enterprise: {
                monthly: enterprise.monthly,
                yearly: enterprise.yearly,
                staffLimit: enterprise.staffLimit,
                excelLimit: enterprise.excelLimit,
                invoiceLimit: enterprise.invoiceLimit,
                analytics: enterprise.analytics,
            },
            updatedAt: new Date(),
        };

        let pricing = await Pricing.findOne();

        if (!pricing) {
            pricing = new Pricing(pricingData);
        } else {
            pricing.starter = pricingData.starter;
            pricing.pro = pricingData.pro;
            pricing.enterprise = pricingData.enterprise;
            pricing.updatedAt = pricingData.updatedAt;
        }

        await pricing.save();

        res.json({
            success: true,
            pricing,
        });
    } catch (error) {
        console.error("Pricing update error:", error);

        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
