const express = require("express");
const router = express.Router();

router.post("/send-otp", async (req, res) => {
    try {
        const response = await fetch(
            "https://n8n-2ud0.onrender.com/webhook/email-otp",
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
