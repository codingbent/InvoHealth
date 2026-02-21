const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login_staff", async (req, res) => {
    try {
        const { phone, password } = req.body;

        const staff = await Staff.findOne({
            phone,
            isActive: true,
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        // 🔹 FIRST LOGIN (NO PASSWORD YET)
        if (!staff.password) {
            return res.json({
                success: true,
                firstLogin: true,
                staffId: staff._id,
            });
        }

        // 🔹 NORMAL LOGIN
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

        res.json({
            success: true,
            token,
            role: staff.role,
            name: staff.name,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
