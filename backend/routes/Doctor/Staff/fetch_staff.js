const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
var fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");

router.get("/fetch_staff", fetchuser, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const staff = await Staff.find({
            doctorId: doctorId,
            // isActive: true,
            isDeleted: false,
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
