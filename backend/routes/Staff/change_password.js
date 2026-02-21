const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
var fetchuser = require("../../middleware/fetchuser");

router.put("/change_password", fetchuser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Missing fields",
            });
        }

        const staff = await Staff.findById(req.user.id);

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, staff.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: "Current password is incorrect",
            });
        }

        const salt = await bcrypt.genSalt(10);
        staff.password = await bcrypt.hash(newPassword, salt);
        await staff.save();

        res.json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
