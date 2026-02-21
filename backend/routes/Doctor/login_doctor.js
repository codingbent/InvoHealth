const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const axios = require("axios");
const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;

router.post("/login_doctor", async (req, res) => {
    const { identifier, password, identifierType } = req.body;

    try {
        let user = null;
        let userRole = null;

        if (identifierType === "email") {
            user = await Doc.findOne({ email: identifier });
            if (user) userRole = "doctor";
        }

        if (!user && identifierType === "phone") {
            user = await Doc.findOne({ phone: identifier });
            if (user) userRole = "doctor";
        }

        if (!user && identifierType === "phone") {
            user = await Staff.findOne({ phone: identifier, isActive: true });
            if (user) userRole = user.role;
        }

        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const payload = {
            user: {
                id: user._id,
                role: userRole,
                doctorId: userRole === "doctor" ? user._id : user.doctorId,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, {
            expiresIn: "7d",
        });

        res.json({
            success: true,
            authtoken,
            role: userRole,
            name: user.name,
            doctorId: userRole === "doctor" ? user._id : user.doctorId,
            theme: user.theme || "light",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

router.post("/send-otp", async (req, res) => {
    const phone = req.body.phone;

    if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            error: "Invalid mobile number",
        });
    }

    try {
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN`,
        );

        console.log("2Factor Response:", response.data);

        if (response.data.Status === "Success") {
            return res.json({
                success: true,
                sessionId: response.data.Details,
            });
        }

        return res.status(400).json({
            success: false,
            error: response.data.Details || "OTP could not be sent",
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            error: "OTP service unavailable",
        });
    }
});

router.post("/check-phone", async (req, res) => {
    const phone = String(req.body.phone || "").replace(/\D/g, "");

    if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            error: "Invalid mobile number",
        });
    }

    try {
        const existingUser = await Doc.findOne({ phone });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: "Phone number already registered",
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

router.post("/verify-otp", async (req, res) => {
    let { sessionId, otp, phone } = req.body;

    // ✅ normalize phone
    phone = phone.replace(/\D/g, "").slice(-10);

    try {
        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`,
        );

        if (response.data.Status !== "Success") {
            return res.status(400).json({
                success: false,
                error: "Invalid OTP",
            });
        }

        // 🔍 Check user in DB
        const doc = await Doc.findOne({ phone });

        if (!doc) {
            return res.status(400).json({
                success: false,
                error: "User not registered",
            });
        }

        const payload = {
            user: {
                id: doc._id,
                role: "doctor",
                doctorId: doc._id,
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET);

        res.json({
            success: true,
            authtoken,
            name: doc.name,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "OTP verification failed",
        });
    }
});

module.exports = router;
