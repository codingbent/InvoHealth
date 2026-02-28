const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const axios = require("axios");

const TWO_FACTOR_API_KEY = process.env.TWO_FACTOR_API_KEY;
router.post(
    "/create_doctor",
    [
        body("name").isLength({ min: 3 }),
        body("email").isEmail(),
        body("password").isLength({ min: 5 }),
        body("clinicName").notEmpty(),
        body("phone").isLength({ min: 10 }),
        body("address.line1").notEmpty(),
        body("address.city").notEmpty(),
        body("address.state").notEmpty(),
        body("address.pincode").isLength({ min: 4 }),
        body("experience").notEmpty(),
        // body("timings").isArray(),
        body("degree").isArray(),
    ],
    async (req, res) => {
        let success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success, errors: errors.array() });
        }

        try {
            let doc = await Doc.findOne({
                $or: [{ email: req.body.email }, { phone: req.body.phone }],
            });

            if (doc) {
                return res.status(400).json({
                    success: false,
                    error: "Email or phone already registered",
                });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            let degrees = Array.isArray(req.body.degree)
                ? req.body.degree
                : [req.body.degree];
            doc = await Doc.create({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
                clinicName: req.body.clinicName,
                phone: req.body.phone,
                appointmentPhone: req.body.appointmentPhone || "",
                address: req.body.address,
                regNumber: req.body.regNumber || "",
                experience: req.body.experience,
                // timings: req.body.timings.map((t) => ({
                //     day: t.day,
                //     slots: t.slots || [],
                //     note: t.note || "",
                // })),
                degree: degrees,
                role: "doctor",
                subscription:"starter",
            });

            const payload = {
                user: {
                    id: doc._id,
                    role: "doctor",
                    doctorId: doc._id,
                },
            };

            const authtoken = jwt.sign(payload, JWT_SECRET);

            success = true;
            res.json({ success, authtoken });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    },
);

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
