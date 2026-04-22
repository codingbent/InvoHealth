const express = require("express");
const router = express.Router();

router.post("/signup_verify_otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        const response = await fetch(
            `${process.env.N8N_BASE_URL}/webhook/verify-otp`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, otp }),
            },
        );

        const data = await response.json();

        // STRICT VALIDATION
        if (!data || typeof data.success !== "boolean") {
            console.error("Invalid n8n response:", data);

            return res.status(502).json({
                success: false,
                message: "OTP verification service error",
            });
        }

        // ONLY TRUST success === true
        if (data.success !== true) {
            return res.status(400).json({
                success: false,
                message: data.message || "Invalid OTP",
            });
        }

        // SAFE RESPONSE (normalized)
        return res.json({
            success: true,
            message: "OTP verified successfully",
        });
    } catch (error) {
        console.error("VERIFY OTP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

module.exports = router;
