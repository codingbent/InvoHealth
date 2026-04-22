const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10, // max 10 requests
    message: {
        success: false,
        error: "Too many attempts. Try again later.",
    },
});

router.post("/login_staff", loginLimiter, async (req, res) => {
    try {
        const { phone, phoneFallback, password } = req.body;

        // Try with country code first, then without, then raw digits
        let staff = await Staff.findOne({ phone });

        if (!staff && phoneFallback) {
            staff = await Staff.findOne({ phone: phoneFallback });
        }

        // Also try searching by just the last 10 digits as fallback
        if (!staff) {
            const digits = phone.replace(/\D/g, "");
            staff = await Staff.findOne({
                phone: { $regex: digits + "$" },
            });
        }

        if (!staff) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        if (staff.isDeleted) {
            return res.status(403).json({
                success: false,
                error: "You no longer have access. Contact your doctor.",
            });
        }

        if (!staff.isActive) {
            return res.status(403).json({
                success: false,
                error: "You no longer have access. Contact your doctor.",
            });
        }

        if (!staff.password) {
            const setupToken = jwt.sign(
                { staffId: staff._id, purpose: "set_password" },
                JWT_SECRET,
                { expiresIn: "15m" },
            );
            return res.json({ success: true, firstLogin: true, setupToken });
        }

        const match = await bcrypt.compare(password, staff.password);
        if (!match) {
            return res.status(400).json({
                success: false,
                error: "Invalid password",
            });
        }

        const token = jwt.sign(
            {
                user: {
                    id: staff._id,
                    role: "staff",
                    staffRole: staff.role,
                    doctorId: staff.doctorId,
                },
            },
            JWT_SECRET,
            { expiresIn: "1d" },
        );

        return res.json({
            success: true,
            token,
            role: staff.role,
            name: staff.name,
        });
    } catch (err) {
        console.error("login_staff error:", err);
        res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
