const express = require("express");
const router = express.Router();
const Pricing = require("../../../models/Pricing");

router.get("/pricing", async (req, res) => {
    try {
        let pricing = await Pricing.findOne();

        // If no pricing exists yet, create default
        // if (!pricing) {
        //     pricing = new Pricing({
        //         starter: {
        //             monthly: 499,
        //             yearly: 4990,
        //             staffLimit: 1,
        //             excelLimit: 2,
        //             invoiceLimit: 50,
        //             analytics: false,
        //         },
        //         pro: {
        //             monthly: 699,
        //             yearly: 6990,
        //             staffLimit: 2,
        //             excelLimit: 5,
        //             invoiceLimit: 200,
        //             analytics: true,
        //         },
        //         enterprise: {
        //             monthly: 999,
        //             yearly: 9990,
        //             staffLimit: -1,
        //             excelLimit: -1,
        //             invoiceLimit: -1,
        //             analytics: true,
        //         },
        //     });

        //     await pricing.save();
        // }

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
