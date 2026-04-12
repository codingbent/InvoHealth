const express = require("express");
const router = express.Router();

router.post("/signup_verify_otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Basic validation
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        // Call n8n webhook
        const response = await fetch(
            "https://n8n-2ud0.onrender.com/webhook/verify-otp",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    otp,
                }),
            }
        );

        // Parse response from n8n
        const data = await response.json();

        // Send back to frontend
        return res.status(200).json(data);

    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

module.exports = router;