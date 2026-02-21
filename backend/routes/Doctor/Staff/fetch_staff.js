const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/fetch_staff", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const staff = await Staff.find({
            doctorId: doctorId,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            staff,
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
