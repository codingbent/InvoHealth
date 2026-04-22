const express = require("express");
const router = express.Router();
const Service = require("../../../models/Service");
var fetchuser = require("../../../middleware/fetchuser");
var requireDoctor = require("../../../middleware/requireDoctor");
var requireSubscription = require("../../../middleware/requiresubscription");
const { body, validationResult } = require("express-validator");

router.post(
    "/create_service",
    fetchuser,
    requireDoctor,
    requireSubscription, 
    [
        body("name").trim().notEmpty().withMessage("Service name is required"),
        body("amount")
            .optional({ checkFalsy: true })
            .isNumeric()
            .withMessage("Amount must be a number")
            .custom((v) => Number(v) >= 0)
            .withMessage("Amount cannot be negative"),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }

        try {
            const doctorId = req.user.doctorId;

            const escapeRegex = (text) =>
                text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            const name = req.body.name.trim();
            const safeName = escapeRegex(name);

            const existingService = await Service.findOne({
                name: { $regex: `^${safeName}$`, $options: "i" },
                doctor: doctorId,
            });

            if (existingService) {
                return res.status(400).json({
                    success: false,
                    error: "Service already exists",
                });
            }

            const service = await Service.create({
                name,
                amount:
                    req.body.amount !== undefined && req.body.amount !== ""
                        ? Number(req.body.amount)
                        : null,
                doctor: doctorId,
            });

            return res.status(201).json({
                success: true,
                service,
            });
        } catch (error) {
            console.error("create_service error:", error);

            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    error: "Service already exists",
                });
            }

            return res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    },
);

module.exports = router;
