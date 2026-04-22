require("dotenv").config();
const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const JWT_SECRET = process.env.JWT_SECRET;

const normalizePhone = (phone) => (phone ? phone.replace(/\D/g, "") : "");

const isValidPhone = (phone) =>
    phone && phone.length >= 8 && phone.length <= 15;

const loginLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.body.identifier || ipKeyGenerator(req),
});

router.post("/login_doctor", loginLimiter, async (req, res) => {
    const { identifier, password } = req.body;

    try {
        const user = await Doc.findOne({ email: identifier });

        if (!user || !user.password) {
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

        let safeSubscription = null;

        if (user.subscription) {
            safeSubscription = {
                plan: user.subscription.plan,
                status: user.subscription.status,
                expiryDate: user.subscription.expiryDate,
            };
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
            subscription: safeSubscription,
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
