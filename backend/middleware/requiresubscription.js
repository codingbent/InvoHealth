const Doc = require("../models/Doc");
const { getSubscriptionStatus } = require("../utils/subscription_check");

const requireSubscription = async (req, res, next) => {
    try {
        const doctorId = req.user?.doctorId;

        if (!doctorId) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized",
            });
        }

        const doctor = await Doc.findById(doctorId).select("subscription");

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const status = getSubscriptionStatus(doctor.subscription);

        if (status !== "active") {
            return res.status(403).json({
                success: false,
                error: "SUBSCRIPTION_EXPIRED",
                message: "Subscription expired. Upgrade required.",
            });
        }

        // Attach to req so handlers can read subscription data without a second DB hit.
        // e.g. req.doctor.subscription.plan
        req.doctor = doctor;

        next();
    } catch (err) {
        console.error("requireSubscription error:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
};

module.exports = requireSubscription;
