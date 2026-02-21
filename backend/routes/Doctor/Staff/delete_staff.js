const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
var fetchuser = require("../../../middleware/fetchuser");

router.delete("/delete_staff/:id", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const staff = await Staff.findOneAndUpdate(
            { _id: req.params.id, doctorId },
            { isActive: false },
            { new: true },
        );

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
