const express = require("express");
const router = express.Router();
const Staff = require("../../models/Staff");
const bcrypt = require("bcryptjs");
const fetchuser = require("../../middleware/fetchuser");

router.put("/change_password", fetchuser, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Missing fields",
            });
        }

        // password MUST be selected explicitly
        const staff = await Staff.findById(req.user.id).select("+password");

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "User not found",
            });
        }

        // first-login safety
        if (!staff.password) {
            return res.status(400).json({
                success: false,
                error: "Password not set yet",
            });
        }

        const isMatch = await bcrypt.compare(currentPassword, staff.password);

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: "Current password is incorrect",
            });
        }

        // strong password validation
        const strongPassword =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

        if (!strongPassword.test(newPassword)) {
            return res.status(400).json({
                success: false,
                error: "Password must contain uppercase, lowercase, number and special character",
            });
        }

        // prevent same password reuse
        const samePassword = await bcrypt.compare(newPassword, staff.password);

        if (samePassword) {
            return res.status(400).json({
                success: false,
                error: "New password must be different",
            });
        }

        const salt = await bcrypt.genSalt(10);

        staff.password = await bcrypt.hash(newPassword, salt);

        await staff.save();

        return res.json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (err) {
        console.error("change_password error:", err);

        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});

module.exports = router;
