const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const OtpSession = require("../../models/Otpsessions");
const rateLimit = require("express-rate-limit");

const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many password reset attempts",
});

async function checkOtpVerified(email) {
    const session = await OtpSession.findOne({
        email: email.toLowerCase(),
        verified: true,
        expiresAt: { $gt: new Date() },
    });

    return !!session;
}

async function clearOtpSession(email) {
    await OtpSession.deleteMany({
        email: email.toLowerCase(),
    });
}

router.post("/reset-password", resetLimiter, async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters",
            });
        }

        // STEP 1: CHECK OTP VERIFIED
        const isVerified = await checkOtpVerified(email);

        if (!isVerified) {
            return res.status(403).json({
                success: false,
                error: "OTP not verified",
            });
        }

        // STEP 2: FIND USER
        const doc = await Doc.findOne({ email: email.toLowerCase() });

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // STEP 3: HASH PASSWORD
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(newPassword, salt);

        await doc.save();

        // STEP 4: CLEAR OTP SESSION
        await clearOtpSession(email);

        return res.json({
            success: true,
            message: "Password reset successful",
        });
    } catch (err) {
        console.error("RESET PASSWORD ERROR:", err); // safer logging
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
