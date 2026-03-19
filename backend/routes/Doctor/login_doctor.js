const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

router.post("/login_doctor", async (req, res) => {
    const { identifier, password, identifierType } = req.body;

    try {
        let user = null;

        if (identifierType === "email") {
            user = await Doc.findOne({ email: identifier });
        } else if (identifierType === "phone") {
            user = await Doc.findOne({ phone: identifier });
        } else {
            return res.status(400).json({
                success: false,
                error: "Invalid identifier type",
            });
        }

        if (!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        if (!user.password) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({
                success: false,
                error: "Invalid credentials",
            });
        }

        const payload = {
            user: {
                id: user._id,
                role: "doctor",
                doctorId: user._id,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            success: true,
            authtoken,
            role: "doctor",
            name: user.name,
            doctorId: user._id,
            subscription: user.subscription || null,
        });
    } catch (err) {
        console.error("Doctor Login Error:", err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
