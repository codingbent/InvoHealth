const express = require("express");
const router = express.Router();
const Payment = require("../../models/Payment");
const fetchuser = require("../../middleware/fetchuser");

router.get("/payment-history", fetchuser, async (req, res) => {
    try {
        const payments = await Payment.find({
            doctorId: req.user.doctorId,
        })
            .sort({ paidAt: -1 })
            .limit(12);

        res.json({
            success: true,
            payments,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
