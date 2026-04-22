const express = require("express");
const router = express.Router();
const Doc = require("../../models/Doc");
const bcrypt = require("bcryptjs");
const fetchuser = require("../../middleware/fetchuser");
const requireDoctor = require("../../middleware/requireDoctor");
const { body, validationResult } = require("express-validator");

const validatePassword = [
    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters")
        .matches(/[A-Z]/)
        .withMessage("Must contain at least one uppercase letter")
        .matches(/[0-9]/)
        .withMessage("Must contain at least one number"),
];

router.put(
    "/change_password",
    fetchuser,
    requireDoctor,
    validatePassword,
    async (req, res) => {
        try {
            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg,
                });
            }

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword) {
                return res.status(400).json({
                    success: false,
                    error: "Current password required",
                });
            }

            const doc = await Doc.findById(req.user.doctorId);

            if (!doc) {
                return res.status(404).json({
                    success: false,
                    error: "Doctor not found",
                });
            }

            const isMatch = await bcrypt.compare(currentPassword, doc.password);

            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    error: "Current password is incorrect",
                });
            }

            if (currentPassword === newPassword) {
                return res.status(400).json({
                    success: false,
                    error: "New password must be different",
                });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            doc.password = hashedPassword;
            await doc.save();

            res.json({
                success: true,
                message: "Password updated successfully",
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    },
);

module.exports = router;
