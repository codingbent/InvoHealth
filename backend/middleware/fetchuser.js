const jwt = require("jsonwebtoken");
const Staff = require("../models/Staff");
const Doc = require("../models/Doc");
const { getSubscriptionStatus } = require("../utils/subscription_check");

const JWT_SECRET = process.env.JWT_SECRET;

const fetchuser = async (req, res, next) => {
    const token = req.header("auth-token");

    if (!token) {
        return res.status(401).json({
            success: false,
            error: "NO_TOKEN",
        });
    }

    try {
        const data = jwt.verify(token, JWT_SECRET);

        if (!data.user) {
            return res.status(401).json({
                success: false,
                error: "INVALID_TOKEN",
            });
        }

        req.user = data.user;

        // ── Staff: check isActive + doctor's subscription ────────────────────
        if (req.user.role === "staff") {
            const staff = await Staff.findById(req.user.id).select(
                "isActive doctorId",
            );

            if (!staff || !staff.isActive) {
                return res.status(403).json({
                    success: false,
                    error: "ACCESS_REVOKED",
                });
            }

            // Guard: make sure doctorId is embedded in the token matches the DB record
            // (prevents a stale token from a reassigned staff member)
            if (
                staff.doctorId &&
                req.user.doctorId &&
                staff.doctorId.toString() !== req.user.doctorId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    error: "ACCESS_REVOKED",
                });
            }

            // Check the doctor's subscription status so staff cannot act on behalf
            // of an expired doctor. We select only the fields we need — no full fetch.
            const doctor = await Doc.findById(req.user.doctorId).select(
                "subscription",
            );

            if (!doctor) {
                return res.status(403).json({
                    success: false,
                    error: "INVALID_ACCOUNT",
                });
            }

            const subStatus = getSubscriptionStatus(doctor.subscription);
            if (subStatus !== "active") {
                return res.status(403).json({
                    success: false,
                    error: "SUBSCRIPTION_EXPIRED",
                    message:
                        "Doctor's subscription has expired. Contact your doctor to renew.",
                });
            }
        }

        // ── Doctor: verify account still exists ──────────────────────────────
        if (req.user.role === "doctor") {
            const doctor = await Doc.findById(req.user.id).select("_id");

            if (!doctor) {
                return res.status(403).json({
                    success: false,
                    error: "INVALID_ACCOUNT",
                });
            }
        }

        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                error: "TOKEN_EXPIRED",
            });
        }

        return res.status(401).json({
            success: false,
            error: "INVALID_TOKEN",
        });
    }
};

module.exports = fetchuser;
