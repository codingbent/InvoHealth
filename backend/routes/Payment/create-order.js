const express = require("express");
const router = express.Router();

const razorpay = require("../config/razorpay");
const fetchuser = require("../../middleware/fetchuser");
const Pricing = require("../../models/Pricing");

router.post("/create-order", fetchuser, async (req, res) => {
    try {
        const { plan, billing } = req.body;

        const pricing = await Pricing.findOne();

        if (!pricing) {
            return res.status(500).json({
                success: false,
                error: "Pricing config missing"
            });
        }

        const planData = pricing[plan];

        const amount =
            billing === "monthly"
                ? planData.monthly
                : planData.yearly;

        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        });

        res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: "Order creation failed"
        });
    }
});

module.exports = router;