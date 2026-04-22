const express = require("express");
const router = express.Router();
const Timing = require("../../../models/Timing");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const requireSubscription = require("../../../middleware/requireSubscription");

router.post(
    "/set_availability",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        try {
            const doctorId = req.user.id;
            const { availability } = req.body;

            if (!availability || !Array.isArray(availability)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid availability data",
                });
            }

            function isOverlapping(slots) {
                for (let i = 0; i < slots.length; i++) {
                    for (let j = i + 1; j < slots.length; j++) {
                        if (
                            slots[i].startTime < slots[j].endTime &&
                            slots[j].startTime < slots[i].endTime
                        ) {
                            return true;
                        }
                    }
                }
                return false;
            }

            for (const dayBlock of availability) {
                if (!dayBlock.day || !dayBlock.slots) {
                    return res.status(400).json({
                        success: false,
                        error: "Invalid day structure",
                    });
                }

                if (isOverlapping(dayBlock.slots)) {
                    return res.status(400).json({
                        success: false,
                        error: `Overlapping slots on ${dayBlock.day}`,
                    });
                }
            }

            const updated = await Timing.findOneAndUpdate(
                { doctorId },
                { availability },
                { new: true, upsert: true },
            );

            res.json({
                success: true,
                data: updated,
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
