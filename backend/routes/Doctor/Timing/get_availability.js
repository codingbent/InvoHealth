const express = require("express");
const router = express.Router();
const Timing = require("../../../models/Timing");
const fetchuser = require("../../../middleware/fetchuser");

router.get("/get_availability", fetchuser, async (req, res) => {
    try {
        const doctorId =
            req.user.role === "doctor" ? req.user.id : req.user.doctorId;

        const data = await Timing.findOne({ doctorId });

        if (!data) {
            return res.json({
                success: true,
                availability: [],
            });
        }

        res.json({
            success: true,
            availability: data.availability,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
