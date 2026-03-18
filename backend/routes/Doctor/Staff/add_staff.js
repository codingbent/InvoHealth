const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
const Doctor = require("../../../models/Doc");
const Pricing = require("../../../models/Pricing");
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

        // ================= 🔥 GET DOCTOR =================
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const plan = doctor.subscription?.plan?.toLowerCase() || "free";

        // ================= 🔥 GET STAFF LIMIT =================
        let staffLimit = 1; // default FREE plan

        if (plan !== "free") {
            const pricing = await Pricing.findOne();

            if (!pricing || !pricing[plan]) {
                return res.status(500).json({
                    success: false,
                    error: "Pricing not configured",
                });
            }

            staffLimit = pricing[plan].staffLimit;
        }

        // ================= 🔥 COUNT STAFF =================
        const currentStaffCount = await Staff.countDocuments({
            doctorId,
            isActive: true,
        });

        // ================= 🚫 LIMIT CHECK =================
        if (staffLimit !== -1 && currentStaffCount >= staffLimit) {
            return res.status(403).json({
                success: false,
                error: `Staff limit reached (${staffLimit}). Upgrade your plan.`,
            });
        }

        // ================= EXISTING STAFF =================
        const existingStaff = await Staff.findOne({ phone });

        if (existingStaff) {
            // SAME DOCTOR
            if (existingStaff.doctorId.toString() === doctorId.toString()) {
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

            existingStaff.doctorId = doctorId;
            existingStaff.name = name;
            existingStaff.role = role;
            existingStaff.isActive = true;

            await existingStaff.save();

            return res.json({
                success: true,
                message: "Staff transferred",
                staff: existingStaff,
            });
        }

        // ================= CREATE STAFF =================
        const staff = await Staff.create({
            doctorId,
            name,
            phone,
            role,
        });

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
