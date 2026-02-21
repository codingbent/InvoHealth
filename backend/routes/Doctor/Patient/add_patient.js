const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
var fetchuser = require("../../../middleware/fetchuser");
const { body } = require("express-validator");

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
            const { name, number, age, gender } = req.body;

            // 🔍 CHECK EXISTING PATIENT (NAME + NUMBER)
            const existingPatient = await Patient.findOne({
                doctor: doctorId,
                name: { $regex: `^${name.trim()}$`, $options: "i" },
                number: number.trim(),
            });

            if (existingPatient) {
                return res.json({
                    success: true,
                    patient: existingPatient,
                    alreadyExists: true,
                });
            }

            // ✅ CREATE NEW PATIENT
            const patient = await Patient.create({
                name: name.trim(),
                number: number.trim(),
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
            // 🔥 DUPLICATE PATIENT
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
