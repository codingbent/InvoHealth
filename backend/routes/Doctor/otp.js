const express = require("express");
const router = express.Router();
const {rateLimit,ipKeyGenerator} = require("express-rate-limit");

const otpLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    keyGenerator: (req) =>
        req.body.identifier || ipKeyGenerator(req),
});

router.post("/send-otp", otpLimiter, async (req, res) => {
    if (!req.body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
        return res.status(400).json({ error: "Invalid email" });
    }
    try {
        const response = await fetch(
            `${process.env.N8N_BASE_URL}/webhook/email-otp`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: req.body.email,
                    user_id: req.body.user_id,
                }),
            },
        );

        const data = await response.json();

        res.status(200).json(data);
    } catch (err) {
        console.error("OTP ERROR:", err);
        res.status(500).json({ error: "Failed to send OTP" });
    }
});

module.exports = router;
