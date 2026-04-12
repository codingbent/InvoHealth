const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const axios = require("axios");

router.post("/send", async (req, res) => {
    try {
        const { email } = req.body;
        console.log("Searching email:", email);
        const user = await Doc.findOne({ email });
        console.log("User found:", user);
        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required",
            });
        }

        // Check if email exists
        // const user = await Doc.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "Email not registered",
            });
        }

        await axios.post("https://n8n-2ud0.onrender.com/webhook/email-otp", {
            email: email,
            userId: email,
        });

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
            "https://n8n-2ud0.onrender.com/webhook/verify-otp",
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
