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
        body("number").isLength({ min: 8 }),
        body("email").optional({ checkFalsy: true }).isEmail(),
        body("dob").notEmpty().isISO8601().withMessage("Invalid date of birth"),
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
            const { name, countryId, number, email, dob, gender } = req.body;

            const cleanName = name.trim().replace(/\s+/g, " ");
            const cleanNumber = number.replace(/\D/g, "");
            const cleanEmail = email?.trim().toLowerCase();
            const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            // ── Compute age from dob ──────────────────────────────────────────
            let age = null;
            let dobDate = null;

            if (dob) {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid DOB format",
                    });
                }

                const [year, month, day] = dob.split("-").map(Number);

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
                        error: "DOB cannot be in future",
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
                        error: "Invalid DOB",
                    });
                }

                dobDate = dob;
            }

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

            // ── STEP 3: no match found — create a new patient record ──────────
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
