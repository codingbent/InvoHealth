const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");

router.post("/reset-password", async (req, res) => {
    try {
        let { phone, newPassword, sessionId } = req.body;

        phone = String(phone || "")
            .replace(/\D/g, "")
            .slice(-10);

        if (!phone || !newPassword || !sessionId) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters",
            });
        }

        // 🔍 Verify user
        const doc = await Doc.findOne({ phone });

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // 🔐 Hash new password
        const salt = await bcrypt.genSalt(10);
        doc.password = await bcrypt.hash(newPassword, salt);
        await doc.save();

        res.json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
