const express = require("express");
const router = express.Router();
const Patient = require("../../models/Patient");
const fetchPatient = require("../../middleware/fetchpatient");

const bcrypt = require("bcryptjs");
const { encrypt } = require("../../utils/crypto");

const VALID_GENDERS = ["Male", "Female"];
const SALT_ROUNDS = 10;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

router.put("/update", fetchPatient, async (req, res) => {
    try {
        if (!req.patient?.id) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const { name, dob, gender, email, number, dialCode } = req.body;

        const updateFields = {};
        let emailChanged = false;

        const existing = await Patient.findById(req.patient.id);

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: "Patient not found",
            });
        }

        /* ── NAME ── */
        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    error: "Name must be a non-empty string",
                });
            }
            updateFields.name = name.trim().slice(0, 100);
        }

        /* ── DOB ── */
        if (dob !== undefined) {
            const birthDate = new Date(`${dob}T00:00:00`);

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
                    error: "DOB cannot be future date",
                });
            }

            let computedAge = today.getFullYear() - birthDate.getFullYear();

            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (
                monthDiff < 0 ||
                (monthDiff === 0 && today.getDate() < birthDate.getDate())
            ) {
                computedAge--;
            }

            if (computedAge < 0 || computedAge > 150) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid DOB",
                });
            }

            updateFields.dob = dob;
            updateFields.age = computedAge;
        }

        /* ── GENDER ── */
        if (gender !== undefined) {
            if (!VALID_GENDERS.includes(gender)) {
                return res.status(400).json({
                    success: false,
                    error: "Gender must be Male or Female",
                });
            }
            updateFields.gender = gender;
        }

        /* ── EMAIL ── */
        if (email !== undefined) {
            const cleanEmail = email.trim().toLowerCase();

            if (!isValidEmail(cleanEmail)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid email format",
                });
            }

            if (cleanEmail !== existing.email) {
                const exists = await Patient.findOne({ email: cleanEmail });

                if (exists && exists._id.toString() !== req.patient.id) {
                    return res.status(400).json({
                        success: false,
                        error: "Email already in use",
                    });
                }

                updateFields.email = cleanEmail;
                emailChanged = true;
            }
        }

        /* ── PHONE (BCRYPT + ENCRYPT SAME AS ADD) ── */
        if (number !== undefined) {
            const cleanNumber = String(number).replace(/\D/g, "");

            if (cleanNumber.length < 6 || cleanNumber.length > 15) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid phone number",
                });
            }

            // check if same number → skip rehash
            const isSame =
                existing.numberHash &&
                (await bcrypt.compare(cleanNumber, existing.numberHash));

            if (!isSame) {
                const encryptedNumber = encrypt(cleanNumber);
                const hashedNumber = await bcrypt.hash(
                    cleanNumber,
                    SALT_ROUNDS,
                );

                updateFields.numberEncrypted = encryptedNumber;
                updateFields.numberHash = hashedNumber;
                updateFields.numberLast4 = cleanNumber.slice(-4);
            }
        }

        /* ── NOTHING TO UPDATE ── */
        if (Object.keys(updateFields).length === 0) {
            return res.status(400).json({
                success: false,
                error: "No valid fields provided to update",
            });
        }

        const updated = await Patient.findByIdAndUpdate(
            req.patient.id,
            { $set: updateFields },
            { new: true, runValidators: true },
        ).select("-numberEncrypted -numberHash");

        /* ── ADD MASKED NUMBER FOR UI ── */
        if (updated?.numberLast4) {
            updated._doc.numberMasked = "******" + updated.numberLast4;
        }

        return res.json({
            success: true,
            patient: updated,
            emailChanged,
        });
    } catch (err) {
        console.error("UPDATE PATIENT ERROR:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
