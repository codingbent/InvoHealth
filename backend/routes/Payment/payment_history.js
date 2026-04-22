const express = require("express");
const router = express.Router();
const Payment = require("../../models/Payment");
const fetchuser = require("../../middleware/fetchuser");

router.get("/payment-history", fetchuser, async (req, res) => {
    try {
        const payments = await Payment.find({ doctorId: req.user.doctorId })
            .sort({ paidAt: -1 })
            .limit(24) // last 24 records (2 years of monthly)
            .lean();

        return res.json({ success: true, payments });
    } catch (err) {
        console.error("payment-history error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
