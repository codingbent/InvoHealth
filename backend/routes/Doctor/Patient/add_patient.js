const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const fetchuser = require("../../../middleware/fetchuser");
const requireSubscription = require("../../../middleware/requiresubscription");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../../../utils/crypto");

const saltRounds = 10;

/* ── HELPER: HANDLE OLD + NEW SCHEMA ───────────────── */
const linkDoctorToPatient = async (patient, doctorId) => {
    if (Array.isArray(patient.doctors)) {
        await Patient.updateOne(
            { _id: patient._id },
            { $addToSet: { doctors: doctorId } },
        );
    } else if (patient.doctor) {
        await Patient.updateOne(
            { _id: patient._id },
            {
                $set: { doctors: [patient.doctor, doctorId] },
                $unset: { doctor: "" },
            },
        );
    } else {
        await Patient.updateOne(
            { _id: patient._id },
            {
                $set: { doctors: [doctorId] },
            },
        );
    }
};

router.post(
    "/add_patient",
    fetchuser,
    requireSubscription,
    [
        body("name", "Enter Name").notEmpty(),
        body("countryId")
            .notEmpty()
            .custom((v) => mongoose.Types.ObjectId.isValid(v)),
        body("number").isLength({ min: 7 }),
        body("email").optional({ checkFalsy: true }).isEmail(),
        // dob is now optional — either dob or age must be present (validated below)
        body("dob")
            .optional({ checkFalsy: true })
            .isISO8601()
            .withMessage("Invalid date of birth format"),
        // age is optional — used when the doctor only knows the patient's age
        body("age")
            .optional({ checkFalsy: true })
            .isInt({ min: 0, max: 120 })
            .withMessage("Age must be between 0 and 120"),
        body("gender").optional().isIn(["Male", "Female"]),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty())
                return res
                    .status(400)
                    .json({ success: false, errors: errors.array() });

            const doctorId = req.user.doctorId;
            const { name, countryId, number, email, gender } = req.body;
            const rawDob = req.body.dob || "";
            const rawAge = req.body.age;

            // ── At least one of dob or age is required ────────────────────────
            if (!rawDob && rawAge === undefined && rawAge === null) {
                return res.status(400).json({
                    success: false,
                    error: "Either date of birth or age is required",
                });
            }

            const cleanName = name.trim().replace(/\s+/g, " ");
            const cleanNumber = number.replace(/\D/g, "");
            const cleanEmail = email?.trim().toLowerCase();
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            // ── Resolve DOB and age ───────────────────────────────────────────
            let age = null;
            let dobDate = null;

            if (rawDob) {
                // DOB provided — validate and derive exact age from it
                if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDob)) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid DOB format. Expected YYYY-MM-DD",
                    });
                }

                const [year, month, day] = rawDob.split("-").map(Number);
                const birthDate = new Date(year, month - 1, day);

                if (isNaN(birthDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid DOB",
                    });
                }

                const today = new Date();

                if (birthDate > today) {
                    return res.status(400).json({
                        success: false,
                        error: "DOB cannot be in the future",
                    });
                }

                age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (
                    monthDiff < 0 ||
                    (monthDiff === 0 && today.getDate() < birthDate.getDate())
                ) {
                    age--;
                }

                if (age > 120) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid DOB: age exceeds 120 years",
                    });
                }

                dobDate = rawDob;
            } else if (
                rawAge !== undefined &&
                rawAge !== null &&
                rawAge !== ""
            ) {
                // Only age provided — store it directly, estimate DOB as Jan 1
                age = parseInt(rawAge, 10);
                if (isNaN(age) || age < 0 || age > 120) {
                    return res.status(400).json({
                        success: false,
                        error: "Age must be between 0 and 120",
                    });
                }
                // Estimate DOB as January 1 of the birth year (approximate)
                const birthYear = new Date().getFullYear() - age;
                dobDate = `${birthYear}-01-01`;
            }

            // ── Duplicate check ───────────────────────────────────────────────
            let existingPatient = null;

            if (cleanEmail) {
                const query = {
                    email: cleanEmail,
                    name: {
                        $regex: `^${escapeRegex(cleanName)}$`,
                        $options: "i",
                    },
                };
                if (dobDate) query.dob = dobDate;

                existingPatient = await Patient.findOne(query);
            }

            if (existingPatient) {
                await linkDoctorToPatient(existingPatient, doctorId);
                return res.json({
                    success: true,
                    patient: existingPatient,
                    alreadyExists: true,
                });
            }

            if (!cleanEmail) {
                const candidateQuery = {
                    name: {
                        $regex: `^${escapeRegex(cleanName)}$`,
                        $options: "i",
                    },
                    numberLast4: cleanNumber.slice(-4),
                };

                if (dobDate) {
                    candidateQuery.dob = dobDate;
                }

                const candidates = await Patient.find(candidateQuery)
                    .limit(10)
                    .lean();

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

                existingPatient = matches.find((p) => p !== null) || null;
            }

            if (existingPatient) {
                await linkDoctorToPatient(existingPatient, doctorId);
                return res.json({
                    success: true,
                    patient: existingPatient,
                    alreadyExists: true,
                });
            }

            // ── Create new patient ────────────────────────────────────────────
            const patient = await Patient.create({
                name: cleanName,
                country: countryId,
                numberEncrypted: encrypt(cleanNumber),
                numberHash: await bcrypt.hash(cleanNumber, saltRounds),
                numberLast4: cleanNumber.slice(-4),
                email: cleanEmail || undefined,
                dob: dobDate || undefined,
                age,
                gender,
                doctors: [doctorId],
            });

            return res.json({ success: true, patient, alreadyExists: false });
        } catch (err) {
            if (err.code === 11000)
                return res
                    .status(409)
                    .json({ success: false, error: "Patient already exists" });
            console.error("AddPatient error:", err);
            return res
                .status(500)
                .json({ success: false, error: "Server error" });
        }
    },
);

module.exports = router;
