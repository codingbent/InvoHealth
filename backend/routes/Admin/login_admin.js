const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../../models/Admin");
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

router.post("/login_admin", async (req, res) => {
    try {
        let { email, password } = req.body;

        // VALIDATION
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Missing credentials",
            });
        }

        // NORMALIZE EMAIL
        email = email.toLowerCase();

        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        const match = await bcrypt.compare(password, admin.password);

        if (!match) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        // USE ROLE FROM DB (not hardcoded)
        const payload = {
            user: {
                id: admin._id,
                role: admin.role || "admin",
                tokenType: "admin", // CRITICAL
            },
        };

        const admintoken = jwt.sign(payload, ADMIN_JWT_SECRET, {
            expiresIn: "7d",
            issuer: "invohealth-api", // optional but recommended
            audience: "admin", // optional but recommended
        });

        return res.json({
            success: true,
            admintoken,
            role: payload.user.role,
            name: admin.name,
        });
    } catch (err) {
        console.error("ADMIN LOGIN ERROR:", err);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
