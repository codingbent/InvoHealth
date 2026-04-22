const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
const Doctor = require("../../../models/Doc");
const Pricing = require("../../../models/Pricing");
var fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const { getPricing } = require("../../../utils/pricingcache");

router.put("/toggle_staff/:id", fetchuser, requireDoctor, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const staff = await Staff.findById(req.params.id);

        if (!staff || staff.doctorId.toString() !== doctorId) {
            return res.status(404).json({
                success: false,
                error: "Staff not found",
            });
        }

        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const plan = doctor.subscription?.plan?.toLowerCase();
        const isActive = doctor.subscription?.status === "active";

        let staffLimit = 0;

        const pricing = await getPricing();

        if (!pricing) {
            return res.status(500).json({
                success: false,
                error: "Pricing not configured",
            });
        }

        if (isActive && plan && pricing[plan]) {
            staffLimit = pricing[plan].staffLimit;
        }

        // ACTIVATION CHECK
        if (!staff.isActive) {
            const activeCount = await Staff.countDocuments({
                doctorId,
                isActive: true,
                isDeleted: false,
            });

            if (staffLimit !== -1 && activeCount >= staffLimit) {
                return res.status(403).json({
                    success: false,
                    error: `Staff limit reached (${staffLimit})`,
                });
            }
        }

        staff.isActive = !staff.isActive;
        await staff.save();

        res.json({
            success: true,
            message: `Staff ${staff.isActive ? "activated" : "deactivated"}`,
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
