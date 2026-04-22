const express = require("express");
const router = express.Router();
const Staff = require("../../../models/Staff");
const Doctor = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const { getPricing } = require("../../../utils/pricingcache");
const { getSubscriptionStatus } = require("../../../utils/subscription_check");
const requireSubscription = require("../../../middleware/requireSubscription");

router.post(
    "/add_staff",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;

            if (!doctorId) {
                return res.status(401).json({
                    success: false,
                    error: "Unauthorized",
                });
            }

            let { name, phone, role } = req.body;

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

            const doctor =
                await Doctor.findById(doctorId).populate("address.countryId");

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    error: "Doctor not found",
                });
            }

            // Subscription gate — same logic as requireSubscription middleware
            const subStatus = getSubscriptionStatus(doctor.subscription);
            const plan = doctor.subscription?.plan?.toLowerCase();

            let staffLimit = 0;
            const pricing = await getPricing();

            if (!pricing) {
                return res.status(500).json({
                    success: false,
                    error: "Pricing not configured",
                });
            }

            if (subStatus === "active" && plan && pricing[plan]) {
                staffLimit = pricing[plan].staffLimit;
            }

            const cleanPhone = phone.replace(/\D/g, "").replace(/^0/, "");
            const dialCode = doctor.address?.countryId?.dialCode || "+91";
            const fullPhone = `${dialCode}${cleanPhone}`;

            // Get active staff count
            const activeStaff = await Staff.find({
                doctorId,
                isActive: true,
                isDeleted: false,
            })
                .sort({ createdAt: 1 })
                .select("_id");

            const currentStaffCount = activeStaff.length;

            // Auto-deactivate overflow staff (e.g. after plan downgrade)
            if (staffLimit !== -1 && currentStaffCount > staffLimit) {
                const extraIds = activeStaff
                    .slice(staffLimit)
                    .map((s) => s._id);
                if (extraIds.length > 0) {
                    await Staff.updateMany(
                        { _id: { $in: extraIds } },
                        { isActive: false },
                    );
                }
            }

            // Enforce limit
            if (staffLimit !== -1 && currentStaffCount >= staffLimit) {
                return res.status(403).json({
                    success: false,
                    error: `Staff limit reached (${staffLimit}). Upgrade your plan.`,
                });
            }

            // Duplicate phone check
            const existingStaff = await Staff.findOne({
                phone: fullPhone,
                isDeleted: false,
            });

            if (existingStaff) {
                if (
                    existingStaff.doctorId &&
                    existingStaff.doctorId.toString() !== doctorId.toString()
                ) {
                    return res.status(400).json({
                        success: false,
                        error: "This phone number is already registered with another doctor.",
                    });
                }

                return res.status(400).json({
                    success: false,
                    error: "Staff with this phone number already exists in your clinic.",
                });
            }

            // Create staff
            const staff = await Staff.create({
                doctorId,
                name,
                phone: fullPhone,
                role,
            });

            return res.json({
                success: true,
                staff,
            });
        } catch (err) {
            console.error("add_staff error:", err);
            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

module.exports = router;
