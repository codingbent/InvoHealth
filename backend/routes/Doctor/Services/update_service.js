const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Service = require("../../../models/Service");
const requireDoctor = require("../../../middleware/requireDoctor");
const fetchuser = require("../../../middleware/fetchuser");
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.put(
    "/update_service/:id",
    fetchuser,
    requireDoctor,
    async (req, res) => {
        try {
            const { name, amount } = req.body;
            const doctorId = req.user.doctorId;
            const serviceId = req.params.id;

            // ───────── VALIDATE OBJECT ID ─────────
            if (!mongoose.Types.ObjectId.isValid(serviceId)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid service ID",
                });
            }

            // ───────── FETCH SERVICE ─────────
            const service = await Service.findOne({
                _id: serviceId,
                doctor: doctorId,
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    error: "Service not found",
                });
            }

            // ───────── UPDATE FIELDS (SAFE) ─────────
            if (name !== undefined) {
                const safeName = escapeRegex(name.trim());

                const existing = await Service.findOne({
                    _id: { $ne: serviceId },
                    doctor: doctorId,
                    name: { $regex: `^${safeName}$`, $options: "i" },
                });

                if (existing) {
                    return res.status(400).json({
                        success: false,
                        error: "Service already exists",
                    });
                }

                service.name = name.trim();
            }

            if (amount !== undefined) {
                // allow clearing amount
                if (amount === "") {
                    service.amount = null;
                } else {
                    const parsedAmount = Number(amount);

                    // reject invalid numbers
                    if (!Number.isFinite(parsedAmount)) {
                        return res.status(400).json({
                            success: false,
                            error: "Amount must be a valid number",
                        });
                    }

                    // reject negatives
                    if (parsedAmount < 0) {
                        return res.status(400).json({
                            success: false,
                            error: "Amount cannot be negative",
                        });
                    }

                    // optional: prevent absurd values
                    if (parsedAmount > 10000000) {
                        return res.status(400).json({
                            success: false,
                            error: "Amount too large",
                        });
                    }

                    service.amount = parsedAmount;
                }
            }

            await service.save();

            return res.json({
                success: true,
                service,
            });
        } catch (err) {
            console.error("update_service error:", err);

            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
