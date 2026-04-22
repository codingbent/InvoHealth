const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const axios = require("axios");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const otpLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.body.identifier || ipKeyGenerator(req),
});

router.post("/signup_send_otp", otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required",
            });
        }

        const user = await Doc.findOne({ email });

        if (user) {
            return res.status(400).json({
                success: false,
                error: "Email already registered",
            });
        }

        await axios.post(`${process.env.N8N_BASE_URL}/webhook/email-otp`, {
            email,
            userId: email,
        });

        return res.json({
            success: true,
            message: "OTP sent successfully",
        });
    } catch (err) {
        console.error("SEND OTP ERROR:", err.message);
        return res.status(500).json({
            success: false,
            error: "Failed to send OTP",
        });
    }
});

module.exports = router;
