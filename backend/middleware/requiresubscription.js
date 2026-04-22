// middleware/requireSubscription.js
//
// PURPOSE:
//   Centralizes the subscription check that was previously duplicated across
//   add_patient.js, add_appointment.js, add_service.js, add_staff.js,
//   dashboard_analytics.js, and others.
//
// USAGE:
//   Place AFTER fetchuser in the middleware chain:
//
//     router.post("/add_patient", fetchuser, requireSubscription, [...validators], handler)
//
//   After this middleware runs, req.doctor is available in the route handler —
//   it contains the doctor document with the subscription field selected.
//   This means routes that previously did their own Doc.findById() for the
//   subscription check can now use req.doctor directly and skip that DB call.
//
// IMPORTANT — what this does NOT replace:
//   Routes that need additional fields beyond "subscription" (e.g. add_staff
//   which also needs address.countryId for dial code) must still do their own
//   Doc.findById() with the extra fields selected. In those cases, remove only
//   the standalone subscription check and use requireSubscription for the gate,
//   then do one combined fetch with all needed fields in the handler.
//
// CHAIN ORDER:
//   fetchuser → requireSubscription → requireDoctor (if needed) → handler
//   fetchuser must run first because requireSubscription reads req.user.doctorId.

"use strict";

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
