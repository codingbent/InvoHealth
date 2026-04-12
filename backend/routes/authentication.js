const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
const Doc = require("../models/Doc");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const axios = require("axios");

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;

router.post("/staff/send-otp", async (req, res) => {
    let phone = String(req.body.phone || "")
        .replace(/\D/g, "")
        .slice(-10);

    const staff = await Staff.findOne({ phone, active: true });
    if (!staff) {
        return res.status(400).json({
            success: false,
            error: "Staff not registered",
        });
    }

    const response = await axios.get(
        `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN/STAFF_LOGIN`,
    );

    res.json({
        success: true,
        sessionId: response.data.Details,
    });
});
router.post("/staff/verify-otp", async (req, res) => {
    const { sessionId, otp, phone } = req.body;

    const response = await axios.get(
        `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`,
    );

    if (response.data.Status !== "Success") {
        return res.status(400).json({
            success: false,
            error: "Invalid OTP",
        });
    }

    const staff = await Staff.findOne({ phone });

    const payload = {
        user: {
            id: staff._id,
            role: "staff",
            staffRole: staff.role,
            doctorId: staff.doctorId,
        },
    };

    const authtoken = jwt.sign(payload, JWT_SECRET);

    res.json({
        success: true,
        authtoken,
        role: staff.role,
        name: staff.name,
    });
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

        // console.log("2Factor Response:", response.data);

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

        // Check if user already exists
        const doc = await Doc.findOne({ phone });

        if (doc) {
            return res.status(409).json({
                success: false,
                error: "Phone already registered",
            });
        }

        res.json({
            success: true,
            message: "Phone verified",
        });
    } catch (err) {
        console.error("OTP VERIFY ERROR:", err.message);

        res.status(500).json({
            success: false,
            error: "OTP verification failed",
        });
    }
});

router.post("/send-reset-otp", async (req, res) => {
    const phone = req.body.phone;

    if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
            success: false,
            error: "Invalid mobile number",
        });
    }

    try {
        const user = await Doc.findOne({ phone });

        if (!user) {
            return res.json({
                success: false,
                error: "Phone number not registered",
            });
        }

        const response = await axios.get(
            `https://2factor.in/API/V1/${TWO_FACTOR_API_KEY}/SMS/${phone}/AUTOGEN`,
        );

        if (response.data.Status === "Success") {
            return res.json({
                success: true,
                sessionId: response.data.Details,
            });
        }

        return res.status(400).json({
            success: false,
            error: response.data.Details,
        });
    } catch (err) {
        console.error(err.message);

        res.status(500).json({
            success: false,
            error: "OTP service unavailable",
        });
    }
});

router.post("/verify-reset-otp", async (req, res) => {
    let { sessionId, otp, phone } = req.body;

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

        const doc = await Doc.findOne({ phone });

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: "Phone number not registered",
            });
        }

        res.json({
            success: true,
            message: "OTP verified",
        });
    } catch (err) {
        console.error(err.message);

        res.status(500).json({
            success: false,
            error: "OTP verification failed",
        });
    }
});

router.get("/wake-n8n", async (req, res) => {
    try {
        await axios.get("https://n8n-2ud0.onrender.com");
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

module.exports = router;
