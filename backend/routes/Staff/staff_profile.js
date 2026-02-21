const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
var fetchuser = require("../../middleware/fetchuser");

router.get("/staff_profile", fetchuser, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id);

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

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
