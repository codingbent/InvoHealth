const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Patient = require("../../../models/Patient");
const Country = require("../../../models/Country");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../../../utils/crypto");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const requireSubscription = require("../../../middleware/requiresubscription");

const saltRounds = 10;

router.put(
    "/update_patient/:id",
    fetchuser,
    requireDoctor,
    requireSubscription,
    [
        body("name").optional().notEmpty(),
        body("number").optional(),
        body("countryId").optional().isMongoId(),
        body("email").optional({ checkFalsy: true }).isEmail(),
        body("dob")
            .optional({ checkFalsy: true })
            .isISO8601()
            .withMessage("Invalid date of birth"),
        body("gender").optional().isIn(["Male", "Female"]),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const doctorId =
                req.user.role === "doctor" ? req.user.id : req.user.doctorId;

            const { name, number, countryId, email, dob, gender } = req.body;

            // validate id
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid patient ID",
                });
            }

            const existingPatient = await Patient.findById(req.params.id);

            if (!existingPatient) {
                return res.status(404).json({
                    success: false,
                    error: "Patient not found",
                });
            }

            // FIX: doctors is array
            const isAuthorized = existingPatient.doctors.some(
                (docId) => docId.toString() === doctorId.toString(),
            );

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    error: "Unauthorized access",
                });
            }

            let computedAge;

            if (dob) {
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

                computedAge = today.getFullYear() - birthDate.getFullYear();

                const monthDiff = today.getMonth() - birthDate.getMonth();

                if (
                    monthDiff < 0 ||
                    (monthDiff === 0 && today.getDate() < birthDate.getDate())
                ) {
                    computedAge--;
                }

                if (computedAge < 0 || computedAge > 120) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid DOB",
                    });
                }
            }
            // validate country
            if (countryId) {
                const exists = await Country.findById(countryId);
                if (!exists) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid country selected",
                    });
                }
            }

            const updateFields = {};

            const finalName = name ? name.trim() : existingPatient.name;
            const cleanEmail =
                email !== undefined ? email.trim().toLowerCase() : undefined;

            const escapeRegex = (str) =>
                str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            if (name) updateFields.name = finalName;
            if (email !== undefined) updateFields.email = cleanEmail;
            if (dob !== undefined) {
                updateFields.dob = dob;
                updateFields.age = computedAge;
            }
            if (gender) updateFields.gender = gender;
            if (countryId) updateFields.country = countryId;

            /* ─── NUMBER UPDATE ─── */
            if (number && String(number).trim() !== "") {
                const cleanNumber = String(number).replace(/\D/g, "");

                if (cleanNumber.length < 7 || cleanNumber.length > 15) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid phone number",
                    });
                }

                const isSame =
                    existingPatient.numberHash &&
                    (await bcrypt.compare(
                        cleanNumber,
                        existingPatient.numberHash,
                    ));

                if (!isSame) {
                    // duplicate check
                    const candidates = await Patient.find({
                        _id: { $ne: req.params.id },
                        doctors: doctorId,
                        numberLast4: cleanNumber.slice(-4),
                    });

                    for (let p of candidates) {
                        if (!p.numberHash) continue;

                        const match = await bcrypt.compare(
                            cleanNumber,
                            p.numberHash,
                        );
                        if (match) {
                            return res.status(409).json({
                                success: false,
                                error: "Patient with same number exists",
                            });
                        }
                    }

                    updateFields.numberHash = await bcrypt.hash(
                        cleanNumber,
                        saltRounds,
                    );
                    updateFields.numberEncrypted = encrypt(cleanNumber);
                    updateFields.numberLast4 = cleanNumber.slice(-4);
                }
            }

            const updateQuery = { $set: updateFields };

            if (number) {
                updateQuery.$unset = { number: "" };
            }

            const patient = await Patient.findByIdAndUpdate(
                req.params.id,
                updateQuery,
                { new: true, select: "-numberHash -numberEncrypted" },
            );

            if (patient?.numberLast4) {
                patient._doc.numberMasked = "******" + patient.numberLast4;
            }

            return res.json({
                success: true,
                message: "Updated successfully",
                patient,
            });
        } catch (err) {
            console.error("UPDATE PATIENT ERROR:", err);
            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
