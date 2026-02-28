const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../../models/Admin");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login_admin", async (req, res) => {
    const { email, password } = req.body;

    try {
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

        const payload = {
            user: {
                id: admin._id,
                role: "superadmin",
                doctorId: null,
            },
        };

        const admintoken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            success: true,
            admintoken,
            role: "superadmin",
            name: admin.name,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
