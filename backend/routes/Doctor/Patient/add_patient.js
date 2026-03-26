const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
var fetchuser = require("../../../middleware/fetchuser");
const { body } = require("express-validator");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../../../utils/crypto");
const Doc = require("../../../models/Doc");
const checkSubscription = require("../../../utils/subscription_check");

const saltRounds = 10;

router.post(
    "/add_patient",
    fetchuser,
    [
        body("name", "Enter Name").notEmpty(),
        body("number").isLength({ min: 10, max: 10 }),
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
            const doctorId = req.user.doctorId;
            const doctor = await Doc.findById(doctorId);

            // AUTO EXPIRE
            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor not found",
                });
            }

            await checkSubscription(doctor);

            // BLOCK
            if (doctor.subscription?.status === "expired") {
                return res.status(403).json({
                    success: false,
                    message: "Subscription expired. Upgrade required.",
                });
            }
            const { name, number, age, gender } = req.body;

            const cleanName = name.trim();
            const cleanNumber = number.trim();

            //Find same-name patients
            const candidates = await Patient.find({
                doctor: doctorId,
                name: { $regex: `^${cleanName}$`, $options: "i" },
            });

            let existingPatient = null;

            //Compare using bcrypt
            for (let p of candidates) {
                if (!p.numberHash) continue;

                const isMatch = await bcrypt.compare(cleanNumber, p.numberHash);

                if (isMatch) {
                    existingPatient = p;
                    break;
                }
            }

            if (existingPatient) {
                return res.json({
                    success: true,
                    patient: existingPatient,
                    alreadyExists: true,
                });
            }

            //Encrypt + Hash
            const encryptedNumber = encrypt(cleanNumber);
            const hashedNumber = await bcrypt.hash(cleanNumber, saltRounds);

            //Create patient
            const patient = await Patient.create({
                name: cleanName,
                numberEncrypted: encryptedNumber,
                numberHash: hashedNumber,
                numberLast4: cleanNumber.slice(-4),
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
