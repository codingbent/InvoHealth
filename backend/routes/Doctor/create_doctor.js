const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const Country = require("../../models/Country");
const {
    PaymentCategory,
    PaymentSubCategory,
} = require("../../models/PaymentMethod");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;
const { encrypt } = require("../../utils/crypto");
const { createLimiter } = require("../../middleware/ratelimiter");
const toStringArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value))
        return [...new Set(value.map(String).filter(Boolean))];
    const s = String(value).trim();
    return s ? [s] : [];
};

router.post(
    "/create_doctor",
    createLimiter({ max: 5 }),
    [
        body("name").isLength({ min: 3 }).trim().escape(),
        body("email").isEmail().normalizeEmail(),
        body("password").isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
        body("clinicName").notEmpty().trim().escape(),
        body("phone").isLength({ min: 8 }),
        body("appointmentPhone").isLength({ min: 8 }),
        body("address.line1").notEmpty().trim().escape(),
        body("address.city").notEmpty().trim().escape(),
        body("address.state").notEmpty().trim().escape(),
        body("address.countryId").notEmpty(),
        body("address.countryCode").notEmpty(),
        body("address.pincode").isLength({ min: 4 }),
        body("experience").notEmpty().isNumeric(),
        body("degree").isArray({ min: 1 }),
        body("regNumber")
            .notEmpty()
            .trim()
            .escape()
            .withMessage("Registration number is required"),
    ],
    async (req, res) => {
        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET not defined");
        }

        let success = false;
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success, errors: errors.array() });
        }

        try {
            // FIX: Country lookup moved inside try/catch so a DB error is caught
            // instead of producing an unhandled rejection.
            const country = await Country.findById(req.body.address.countryId);
            if (!country) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid country",
                });
            }

            const normalizePhone = (phone) =>
                phone ? phone.replace(/\D/g, "") : "";

            const isValidPhone = (phone) =>
                phone && phone.length >= 8 && phone.length <= 15;

            const cleanPhone = normalizePhone(req.body.phone);
            const cleanAppointmentPhone = normalizePhone(
                req.body.appointmentPhone,
            );

            let appointmentPhoneHash = "";
            let appointmentPhoneEncrypted = "";
            let appointmentPhoneLast4 = "";

            if (cleanAppointmentPhone) {
                if (!isValidPhone(cleanAppointmentPhone)) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid appointment phone number",
                    });
                }

                appointmentPhoneHash = await bcrypt.hash(
                    cleanAppointmentPhone,
                    10,
                );
                appointmentPhoneEncrypted = encrypt(cleanAppointmentPhone);
                appointmentPhoneLast4 = cleanAppointmentPhone.slice(-4);
            }

            if (!isValidPhone(cleanPhone)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid phone number",
                });
            }

            const email = req.body.email.toLowerCase().trim();

            // Duplicate email check
            let doc = await Doc.findOne({ email });
            if (doc) {
                return res.status(400).json({
                    success: false,
                    error: "Email already registered",
                });
            }

            let validatedPaymentMethods = [];

            if (
                Array.isArray(req.body.paymentMethods) &&
                req.body.paymentMethods.length > 0
            ) {
                const submittedCategoryIds = [
                    ...new Set(
                        req.body.paymentMethods.map((p) =>
                            p.categoryId?.toString(),
                        ),
                    ),
                ].filter(Boolean);

                const submittedSubCategoryIds = [
                    ...new Set(
                        req.body.paymentMethods.map((p) =>
                            p.subCategoryId?.toString(),
                        ),
                    ),
                ].filter(Boolean);

                const [validCategories, validSubCategories] = await Promise.all(
                    [
                        PaymentCategory.find({
                            _id: { $in: submittedCategoryIds },
                            isActive: true,
                        })
                            .select("_id")
                            .lean(),
                        PaymentSubCategory.find({
                            _id: { $in: submittedSubCategoryIds },
                            isActive: true,
                        })
                            .select("_id categoryId")
                            .lean(),
                    ],
                );

                const validCategoryIdSet = new Set(
                    validCategories.map((c) => c._id.toString()),
                );
                const validSubCategoryMap = new Map(
                    validSubCategories.map((s) => [
                        s._id.toString(),
                        s.categoryId.toString(),
                    ]),
                );

                for (const p of req.body.paymentMethods) {
                    const catId = p.categoryId?.toString();
                    const subId = p.subCategoryId?.toString();

                    if (!catId || !subId) continue;
                    if (!validCategoryIdSet.has(catId)) continue;

                    const subCatParent = validSubCategoryMap.get(subId);
                    if (!subCatParent || subCatParent !== catId) continue;

                    validatedPaymentMethods.push({
                        categoryId: p.categoryId,
                        subCategoryId: p.subCategoryId,
                        label:
                            typeof p.label === "string"
                                ? p.label.trim().slice(0, 100)
                                : "",
                        isActive: true,
                    });
                }
            }

            const phoneHash = await bcrypt.hash(cleanPhone, 10);
            const phoneEncrypted = encrypt(cleanPhone);

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

            const specialization = toStringArray(req.body.specialization);
            const doctorType = toStringArray(req.body.doctorType);

            doc = await Doc.create({
                name: req.body.name,
                email,
                password: hashedPassword,
                clinicName: req.body.clinicName,

                phoneEncrypted,
                phoneHash,
                phoneLast4: cleanPhone.slice(-4),

                appointmentPhoneEncrypted,
                appointmentPhoneHash,
                appointmentPhoneLast4,

                paymentMethods: validatedPaymentMethods,

                address: {
                    ...req.body.address,
                    countryId: req.body.address.countryId,
                    countryCode: req.body.address.countryCode,
                },
                regNumber: req.body.regNumber || "",
                experience: Number(req.body.experience),
                degree: degrees,
                specialization,
                doctorType,

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
                    imageUploads: 0,
                },
            });

            const payload = {
                user: {
                    id: doc._id,
                    role: "doctor",
                    doctorId: doc._id,
                },
            };

            const authtoken = jwt.sign(payload, JWT_SECRET, {
                expiresIn: "7d",
            });

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
