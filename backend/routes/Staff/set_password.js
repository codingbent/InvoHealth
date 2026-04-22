const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/set_password", async (req, res) => {
    try {
        const { setupToken, password } = req.body;

        // ── Basic validation ──
        if (!setupToken || !password) {
            return res.status(400).json({
                success: false,
                error: "Missing data",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 8 characters",
            });
        }

        // ── Verify token ──
        let decoded;
        try {
            decoded = jwt.verify(setupToken, JWT_SECRET);
        } catch (err) {
            return res.status(403).json({
                success: false,
                error: "Invalid or expired token",
            });
        }

        if (decoded.purpose !== "set_password") {
            return res.status(403).json({
                success: false,
                error: "Invalid token purpose",
            });
        }

        const staff = await Staff.findById(decoded.staffId);

        // ── Check valid user + token reuse ──
        if (!staff || staff.password) {
            return res.status(400).json({
                success: false,
                error: "Invalid or already used link",
            });
        }

        // ── Hash password ──
        const salt = await bcrypt.genSalt(10);
        staff.password = await bcrypt.hash(password, salt);

        // OPTIONAL: mark token used (recommended if field exists)
        staff.setupTokenUsed = true;

        await staff.save();

        // ── NO AUTO LOGIN ──
        return res.json({
            success: true,
            message: "Password set successfully. Please login.",
        });
    } catch (err) {
        console.error("SET PASSWORD ERROR:", err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
