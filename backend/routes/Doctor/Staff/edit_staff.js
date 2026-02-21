const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
var fetchuser = require("../../../middleware/fetchuser");

router.put("/edit_staff/:id", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;
        const { name, phone, role } = req.body;

        const staff = await Staff.findOne({
            _id: req.params.id,
            doctorId: doctorId,
            isActive: true,
        });

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        if (name) staff.name = name;
        if (phone) staff.phone = phone.replace(/\D/g, "").slice(-10);
        if (role) staff.role = role;

        await staff.save();

        res.json({
            success: true,
            staff,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
