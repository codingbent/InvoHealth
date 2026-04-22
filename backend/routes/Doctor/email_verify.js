const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const axios = require("axios");

const { rateLimit } = require("express-rate-limit");

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 5, // max 5 requests
    message: {
        success: false,
        error: "Too many OTP requests. Try later.",
    },
});
router.post("/send", otpLimiter, async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required",
            });
        }

        // ================= EMAIL COOLDOWN =================
        const now = Date.now();
        const lastSent = otpCooldown.get(email);

        if (lastSent && now - lastSent < COOLDOWN_MS) {
            return res.status(429).json({
                success: false,
                error: "Please wait before requesting another OTP",
            });
        }

        // ================= CHECK USER =================
        const user = await Doc.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Email not registered",
            });
        }

        // ================= SEND OTP =================
        await axios.post(`${process.env.N8N_BASE_URL}/webhook/email-otp`, {
            email,
            userId: email,
        });

        // ================= SAVE COOLDOWN =================
        otpCooldown.set(email, now);

        return res.json({
            success: true,
            message: "OTP sent successfully",
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Failed to send OTP",
        });
    }
});

router.post("/verify", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: "Email and OTP are required",
            });
        }

        const response = await axios.post(
            `${process.env.N8N_BASE_URL}/webhook/verify-otp`,
            { email, otp },
        );

        const data = response.data;

        if (!data.success) {
            return res.status(400).json({
                success: false,
                error: data.message || "Invalid OTP",
            });
        }

        return res.json({
            success: true,
            message: "OTP verified successfully",
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({
            success: false,
            error: "Verification failed",
        });
    }
});

module.exports = router;
