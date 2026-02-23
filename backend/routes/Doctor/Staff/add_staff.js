const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
var fetchuser = require("../../../middleware/fetchuser");

router.post("/add_staff", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        if (!doctorId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        let { name, phone, role } = req.body;

        phone = phone.replace(/\D/g, "").slice(-10);

        if (!name || !phone || !role) {
            return res.status(400).json({
                success: false,
                error: "All fields are required",
            });
        }

        if (!["receptionist", "assistant", "nurse"].includes(role)) {
            return res.status(400).json({
                success: false,
                error: "Invalid role",
            });
        }

        const existingStaff = await Staff.findOne({ phone, doctorId });

        if (existingStaff) {
            if (!existingStaff.isActive) {
                existingStaff.isActive = true;
                existingStaff.name = name;
                existingStaff.role = role;
                await existingStaff.save();

                return res.json({
                    success: true,
                    message: "Staff reactivated",
                });
            }

            return res.status(400).json({
                success: false,
                error: "Staff already exists",
            });
        }

        const staff = await Staff.create({
            doctorId: doctorId,
            name,
            phone,
            role,
            theme:"dark",
        });

        res.json({
            success: true,
            staff,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: err,
        });
    }
});

module.exports = router;
