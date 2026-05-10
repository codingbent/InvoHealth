const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

/**
 * createLimiter — universal rate limiter factory
 *
 * Automatically resolves the authenticated identity across all roles:
 *   - Doctor  → req.user.id     (set by fetchuser)
 *   - Staff   → req.user.id     (set by fetchuser)
 *   - Patient → req.patient.id  (set by fetchpatient)
 *   - Admin   → req.admin.id    (set by fetchadmin)
 *   - Public  → req.ip          (fallback for unauthenticated routes)
 *
 * @param {object} options
 * @param {number} options.max          - Max requests per window (required)
 * @param {number} [options.windowMs]   - Window in ms (default: 60_000 = 1 min)
 * @param {string} [options.message]    - Custom error message string
 *
 * @example
 * // Invoice routes (patient)
 * router.get("/download-invoice/:visitId", fetchPatient, createLimiter({ max: 5 }), handler);
 *
 * // Login route (public, stricter)
 * router.post("/login", createLimiter({ max: 5, windowMs: 30 * 60 * 1000 }), handler);
 *
 * // Export route (doctor/staff)
 * router.post("/email_export", fetchuser, createLimiter({ max: 10 }), handler);
 */
const createLimiter = ({ max, windowMs = 60_000, message } = {}) => {
    if (!max || typeof max !== "number") {
        throw new Error("createLimiter: max (number) is required");
    }

    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,

        keyGenerator: (req) =>
            req.user?.id || // doctor or staff (fetchuser)
            req.patient?.id || // patient (fetchpatient)
            req.admin?.id || // admin (fetchadmin)
            ipKeyGenerator(req), // IPv6-safe IP fallback (public routes)

        message: {
            success: false,
            error: message || "Too many requests. Please try again later.",
        },

        handler: (req, res) => {
            return res.status(429).json({
                success: false,
                error: message || "Too many requests. Please try again later.",
            });
        },
    });
};

module.exports = { createLimiter };
