const express = require("express");
const router = express.Router();
const Timing = require("../../../models/Timing");
const fetchuser = require("../../../middleware/fetchuser");

// UPDATE / CREATE availability
router.put("/update_availability", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { availability } = req.body;

        if (!availability || !Array.isArray(availability)) {
            return res.status(400).json({
                success: false,
                error: "Invalid availability format",
            });
        }

        const updated = await Timing.findOneAndUpdate(
            { doctorId },
            { $set: { availability } },
            {
                new: true,
                upsert: true, //  creates if not exists
            },
        );

        res.json({
            success: true,
            availability: updated.availability,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;