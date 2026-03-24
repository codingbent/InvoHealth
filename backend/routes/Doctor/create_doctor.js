const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

router.post(
    "/create_doctor",
    [
        body("name").isLength({ min: 3 }),
        body("email").isEmail(),
        body("password").isLength({ min: 5 }),
        body("clinicName").notEmpty(),
        body("phone").matches(/^[6-9]\d{9}$/),
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

            const allowedPlans = ["STARTER", "PRO", "ENTERPRISE"];

            const selectedPlan = allowedPlans.includes(
                req.body.subscription?.plan,
            )
                ? req.body.subscription.plan
                : "STARTER";

            const selectedBilling =
                req.body.subscription?.billing === "yearly"
                    ? "yearly"
                    : "monthly";

            let degrees = Array.isArray(req.body.degree)
                ? [...new Set(req.body.degree)]
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
                experience: Number(req.body.experience),
                degree: degrees,
                role: "doctor",

                subscription: {
                    plan: selectedPlan,
                    billingCycle: selectedBilling,
                    status: "trial",
                    startDate: new Date(),
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },

                usage: {
                    excelExports: 0,
                    invoiceDownloads: 0,
                },
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

module.exports = router;
