const express = require("express");
const router = express.Router();
const Service = require("../../../models/Service");
var fetchuser = require("../../../middleware/fetchuser");
const { body } = require("express-validator");

router.post(
    "/create_service",
    fetchuser,
    [body("name").notEmpty(), body("amount").isNumeric()],
    async (req, res) => {
        try {
            const existingService = await Service.findOne({
                name: req.body.name,
                doctor: req.user.doctorId,
            });

            if (existingService) {
                return res.status(400).json({
                    success: false,
                    error: "Service already exists for this doctor",
                });
            }

            const service = await Service.create({
                name: req.body.name,
                amount: req.body.amount,
                doctor: req.user.doctorId,
            });

            res.status(200).json({
                success: true,
                status: "Added successfully",
                service,
            });
        } catch (error) {
            console.error(error.message);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    },
);

module.exports = router;
