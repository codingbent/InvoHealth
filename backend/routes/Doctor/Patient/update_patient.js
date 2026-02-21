const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const { body, validationResult } = require("express-validator");

router.put(
    "/update_patient/:id",
    [
        body("name", "Enter Name").notEmpty(),
        body("service").optional(),
        body("number").optional(),
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
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Extract fields
            const { name, service, number, amount, age, gender } = req.body;

            // Build update object dynamically
            const updateFields = {};
            if (name) updateFields.name = name;
            if (service) updateFields.service = service;
            if (number) updateFields.number = number;
            if (amount) updateFields.amount = amount;
            if (age) updateFields.age = age;

            // 👉 Add gender
            if (gender) updateFields.gender = gender;

            // Update patient
            const patient = await Patient.findByIdAndUpdate(
                req.params.id,
                { $set: updateFields },
                { new: true },
            );

            if (!patient) {
                return res.status(404).json({ message: "Patient not found" });
            }

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
