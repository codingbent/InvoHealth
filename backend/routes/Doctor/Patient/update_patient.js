const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const Country = require("../../../models/Country");
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../../../utils/crypto"); //  add this
var fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const requireSubscription = require("../../../middleware/requiresubscription");

const saltRounds = 10;

router.put(
    "/update_patient/:id",
    fetchuser,
    requireDoctor,
    requireSubscription,
    [
        body("name", "Enter Name").optional().notEmpty(),
        body("service").optional(),
        body("number").optional(),
        body("countryId").optional().isMongoId(),
        body("email")
            .optional({ checkFalsy: true })
            .isEmail()
            .withMessage("Invalid email"),
        body("amount").optional(),
        body("age")
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage("Age must be a number"),
        body("gender")
            .optional()
            .isIn(["Male", "Female"])
            .withMessage("Gender must be Male, Female"),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const doctorId = req.user.doctorId;
            const {
                name,
                service,
                number,
                countryId,
                email,
                amount,
                age,
                gender,
            } = req.body;

            //  fetch existing patient (for security + fallback name)
            const existingPatient = await Patient.findById(req.params.id);

            if (countryId) {
                const exists = await Country.findById(countryId);
                if (!exists) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid country selected",
                    });
                }
            }
            if (!existingPatient) {
                return res.status(404).json({ message: "Patient not found" });
            }

            if (existingPatient.doctor.toString() !== doctorId) {
                return res.status(403).json({ message: "Unauthorized" });
            }

            const updateFields = {};

            const finalName = name ? name.trim() : existingPatient.name;
            const cleanEmail = email?.trim().toLowerCase() || undefined;

            const escapeRegex = (str) =>
                str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            if (name) updateFields.name = finalName;
            if (service) updateFields.service = service;
            if (email !== undefined) updateFields.email = cleanEmail;
            if (amount !== undefined) updateFields.amount = amount;
            if (age !== undefined) updateFields.age = age;
            if (gender) updateFields.gender = gender;
            if (countryId) updateFields.country = countryId;

            if (number) {
                const cleanNumber = number.replace(/\D/g, "");

                const alreadyHasSecureNumber =
                    existingPatient.numberEncrypted &&
                    existingPatient.numberHash;

                let shouldUpdate = true;

                if (alreadyHasSecureNumber) {
                    const isSame = await bcrypt.compare(
                        cleanNumber,
                        existingPatient.numberHash,
                    );

                    if (isSame) shouldUpdate = false;
                }

                if (shouldUpdate) {
                    const candidates = await Patient.find({
                        _id: { $ne: req.params.id },
                        doctor: doctorId,
                        name: {
                            $regex: `^${escapeRegex(finalName)}$`,
                            $options: "i",
                        },
                        numberLast4: cleanNumber.slice(-4),
                    });

                    for (let p of candidates) {
                        if (!p.numberHash) continue;

                        const isMatch = await bcrypt.compare(
                            cleanNumber,
                            p.numberHash,
                        );

                        if (isMatch) {
                            return res.status(409).json({
                                success: false,
                                error: "Patient with same name and number already exists",
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

            const updateQuery = {
                $set: updateFields,
            };

            if (number) {
                updateQuery["$unset"] = { number: "" };
            }

            const patient = await Patient.findByIdAndUpdate(
                req.params.id,
                updateQuery,
                { new: true },
            );

            res.status(200).json({
                success: true,
                status: "Updated successfully",
                patient,
            });
        } catch (err) {
            console.error(err.message);
            res.status(500).json({ message: "Server error" });
        }
    },
);

module.exports = router;
