const express = require("express");
const router = express.Router();
const Pricing = require("../../../models/Pricing");

router.get("/pricing", async (req, res) => {
    try {
        let pricing = await Pricing.findOne().lean();

        if (!pricing) {
            pricing = {
                discount: 17,
                starter: {
                    monthly: 0,
                    staffLimit: 0,
                    excelLimit: 0,
                    invoiceLimit: 0,
                    analytics: false,
                },
                pro: {
                    monthly: 0,
                    staffLimit: 0,
                    excelLimit: 0,
                    invoiceLimit: 0,
                    analytics: true,
                },
                enterprise: {
                    monthly: 0,
                    staffLimit: 0,
                    excelLimit: 0,
                    invoiceLimit: 0,
                    analytics: true,
                },
            };
        }

        res.json({
            success: true,
            pricing,
        });
    } catch (error) {
        console.error("Pricing fetch error:", error);

        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
