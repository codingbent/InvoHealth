const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
var fetchuser = require("../../../middleware/fetchuser");
var requireSubscription = require("../../../middleware/requiresubscription");
const { body } = require("express-validator");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../../../utils/crypto");
const { validationResult } = require("express-validator");

const saltRounds = 10;

router.post(
    "/add_patient",
    fetchuser,
    requireSubscription,
    [
        body("name", "Enter Name").notEmpty(),
        body("countryId")
            .notEmpty()
            .withMessage("Country is required")
            .custom((value) => mongoose.Types.ObjectId.isValid(value))
            .withMessage("Invalid countryId"),
        body("number").isLength({ min: 8 }),
        body("email")
            .optional({ checkFalsy: true })
            .isEmail()
            .withMessage("Invalid email"),
        body("age")
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage("Age must be a number"),
        body("gender")
            .optional()
            .isIn(["Male", "Female"])
            .withMessage("Gender must be Male or Female"),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array(),
                });
            }

            const doctorId = req.user.doctorId;
            const { name, countryId, number, email, age, gender } = req.body;

            const cleanName = name.trim();
            // sanitize
            const cleanNumber = number.replace(/\D/g, "");
            const cleanEmail = email?.trim().toLowerCase() || undefined;

            const escapeRegex = (str) =>
                str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            // Optimized candidate query
            const candidates = await Patient.find({
                doctor: doctorId,
                name: {
                    $regex: `^${escapeRegex(cleanName)}$`,
                    $options: "i",
                },
                numberLast4: cleanNumber.slice(-4),
            })
                .limit(10)
                .lean();

            // Parallel bcrypt check
            let existingPatient = null;

            if (!countryId) {
                return res.status(400).json({
                    success: false,
                    error: "Country is required",
                });
            }

            if (candidates.length > 0) {
                const matches = await Promise.all(
                    candidates.map(async (p) => {
                        if (!p.numberHash) return null;
                        const isMatch = await bcrypt.compare(
                            cleanNumber,
                            p.numberHash,
                        );
                        return isMatch ? p : null;
                    }),
                );

                existingPatient = matches.find((p) => p !== null);
            }

            if (existingPatient) {
                return res.json({
                    success: true,
                    patient: existingPatient,
                    alreadyExists: true,
                });
            }

            // Encrypt + Hash
            const encryptedNumber = encrypt(cleanNumber);
            const hashedNumber = await bcrypt.hash(cleanNumber, saltRounds);

            // Create patient
            const patient = await Patient.create({
                name: cleanName,
                country: countryId,
                numberEncrypted: encryptedNumber,
                numberHash: hashedNumber,
                numberLast4: cleanNumber.slice(-4),
                email: cleanEmail,
                age,
                gender,
                doctor: doctorId,
            });

            res.json({
                success: true,
                patient,
                alreadyExists: false,
            });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    error: "Patient with same name and number already exists",
                    alreadyExists: true,
                });
            }

            console.error("AddPatient error:", err);
            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
