const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
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

module.exports = router;
