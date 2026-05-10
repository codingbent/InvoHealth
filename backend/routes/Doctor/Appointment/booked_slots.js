const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Appointment = require("../../../models/Appointment");
const fetchuser = require("../../../middleware/fetchuser");
const requireSubscription = require("../../../middleware/requiresubscription");

router.get(
    "/booked_slots",
    fetchuser,
    requireSubscription,
    async (req, res) => {
        try {
            const doctorId =
                req.user.role === "doctor" ? req.user.id : req.user.doctorId;

            const { date } = req.query;

            if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid or missing date",
                });
            }

            const results = await Appointment.aggregate([
                {
                    $match: {
                        doctor: new mongoose.Types.ObjectId(doctorId),
                    },
                },

                { $unwind: "$visits" },

                {
                    $match: {
                        "visits.date": date,
                        "visits.time": {
                            $exists: true,
                            $ne: null,
                        },
                    },
                },

                {
                    $group: {
                        _id: null,
                        slots: {
                            $push: "$visits.time",
                        },
                    },
                },
            ]);

            const bookedSlots = results[0]?.slots ?? [];

            res.json({
                success: true,
                slots: bookedSlots,
            });
        } catch (err) {
            console.error("Booked slots error:", err);

            res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
