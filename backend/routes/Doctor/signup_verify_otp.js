const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { store, hashOtp } = require("../../utils/otpUtils");
const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) =>
        req.body?.email?.toLowerCase().trim() ?? ipKeyGenerator(req),
    handler: (_, res) =>
        res
            .status(429)
            .json({
                success: false,
                message: "Too many attempts. Request a new OTP.",
            }),
});
router.post("/signup_verify_otp", otpVerifyLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Basic validation
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        const key = String(email).toLowerCase().trim();

        // Get OTP record (Redis / store)
        const record = await store.get(key);

        if (!record) {
            return res.status(400).json({
                success: false,
                message: "OTP not found or expired",
            });
        }

        // Expiry check FIRST
        if (Date.now() > record.expiresAt) {
            await store.delete(key);
            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new one.",
            });
        }

        // Timing-safe hash compare — prevents timing oracle attacks
        const providedHash = hashOtp(String(otp));
        let isValid = false;
        try {
            isValid = crypto.timingSafeEqual(
                Buffer.from(providedHash, "utf8"),
                Buffer.from(record.hash, "utf8"),
            );
        } catch {
            // Buffer lengths differ — hashes can't match
            isValid = false;
        }

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Delete after success (single-use OTP)
        await store.delete(key);

        return res.json({
            success: true,
            message: "OTP verified successfully",
        });
    } catch (err) {
        console.error("VERIFY OTP ERROR:", err.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

module.exports = router;
