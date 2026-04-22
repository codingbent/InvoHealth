const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
const fetchuser = require("../../../middleware/fetchuser");

// This assumes fetchuser sets req.user.staffId for staff login

router.post("/remove_doctor", fetchuser, async (req, res) => {
    try {
        const staffId = req.user.id;

        if (!staffId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized (staff only)",
            });
        }

        const staff = await Staff.findById(staffId);

        if (!staff) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        if (!staff.doctorId) {
            return res.status(400).json({
                success: false,
                error: "No doctor assigned",
            });
        }

        //REMOVE DOCTOR RELATION
        staff.doctorId = null;
        staff.isActive = false;

        await staff.save();

        return res.json({
            success: true,
            message: "You have successfully left the doctor",
        });
    } catch (err) {
        console.error("remove_doctor error:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
