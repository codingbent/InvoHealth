const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Patient = require("../../models/Patient");
const jwt = require("jsonwebtoken");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { store, hashOtp } = require("../../utils/otpUtils");
const fetchpatient = require("../../middleware/fetchpatient");

const JWT_SECRET = process.env.JWT_SECRET;

// ── Rate limiter for login OTP verify (keyed by email) ───────────────────────
const verifyOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) =>
        typeof req.body?.email === "string"
            ? req.body.email.toLowerCase().trim()
            : ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
        res.status(429).json({
            success: false,
            message: "Too many attempts. Request a new OTP.",
        }),
});

// ── Rate limiter for change-email verify (keyed by authenticated patient ID) ─
// The change-email route doesn't have email in req.body so we key by patient ID.
const changeEmailVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => req.patient?.id ?? ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
        res.status(429).json({
            success: false,
            message: "Too many attempts. Request a new OTP.",
        }),
});

// ── POST /api/patient/verify_otp ─────────────────────────────────────────────
router.post("/verify_otp", verifyOtpLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;

        // ── Input validation ───────────────────────────────────────────────
        if (!email || typeof email !== "string") {
            return res
                .status(400)
                .json({ success: false, message: "Email is required" });
        }

        if (!otp) {
            return res
                .status(400)
                .json({ success: false, message: "OTP is required" });
        }

        // Strip non-digits — reject objects / injection payloads
        const otpStr = String(otp).replace(/\D/g, "");
        if (otpStr.length !== 6) {
            return res
                .status(400)
                .json({ success: false, message: "OTP must be 6 digits" });
        }

        const cleanEmail = email.toLowerCase().trim();

        const record = await store.get(`login:${cleanEmail}`);

        if (!record) {
            return res.status(400).json({
                success: false,
                message: "OTP expired or not found. Please request a new one.",
            });
        }

        const providedHash = hashOtp(otpStr);

        let isMatch = false;
        try {
            isMatch = crypto.timingSafeEqual(
                Buffer.from(providedHash, "utf8"),
                Buffer.from(record.hash, "utf8"),
            );
        } catch {
            return res
                .status(400)
                .json({ success: false, message: "Invalid OTP" });
        }

        if (!isMatch) {
            return res
                .status(400)
                .json({ success: false, message: "Invalid OTP" });
        }

        // Single-use: delete immediately after successful match
        await store.delete(`login:${cleanEmail}`);

        // ── Look up patient(s) by email ────────────────────────────────────
        const patients = await Patient.find({ email: cleanEmail }).lean();

        if (patients.length === 0) {
            return res.status(200).json({
                success: false,
                requiresSignup: true,
                message: "No account found",
            });
        }

        if (patients.length > 1) {
            await store.set(
                `profile-select:${cleanEmail}`,
                { verified: true },
                5 * 60 * 1000,
            );

            return res.json({
                success: true,
                selectPatient: true,
                patients: patients.map((p) => ({
                    id: p._id,
                    name: p.name,
                    email: p.email,
                    age: p.age,
                    gender: p.gender,
                })),
            });
        }
        // ── Single patient — issue JWT ─────────────────────────────────────
        const patient = patients[0];

        if (!JWT_SECRET) {
            return res
                .status(500)
                .json({ success: false, message: "Server config error" });
        }

        const token = jwt.sign(
            { patient: { id: patient._id, role: "patient" } },
            JWT_SECRET,
            { expiresIn: "7d" },
        );

        return res.json({
            success: true,
            token,
            patient: {
                id: patient._id,
                name: patient.name,
                email: patient.email,
                age: patient.age,
                gender: patient.gender,
            },
        });
    } catch (err) {
        console.error("VERIFY OTP ERROR:", err.message);
        return res
            .status(500)
            .json({ success: false, message: "Server error" });
    }
});

// ── POST /api/patient/change-email/verify ────────────────────────────────────
router.post(
    "/change-email/verify",
    fetchpatient,
    changeEmailVerifyLimiter,
    async (req, res) => {
        try {
            // ── Input validation ───────────────────────────────────────────
            const otpStr = String(req.body.otp || "").replace(/\D/g, "");

            if (otpStr.length !== 6) {
                return res
                    .status(400)
                    .json({ success: false, message: "OTP must be 6 digits" });
            }

            // FIX 1: Look up by patient ID (matches how send-otp stored it),
            // NOT by req.patient.email which is the *current* email — completely
            // different from the new email the OTP was sent to.
            const record = await store.get(`change-email:${req.patient.id}`);

            if (!record) {
                return res.status(400).json({
                    success: false,
                    message: "OTP expired or not found",
                });
            }

            // FIX 2: Actually verify the OTP using constant-time comparison.
            // The previous implementation had only a comment here and skipped
            // directly to deleting the OTP and updating the email — a complete
            // authentication bypass.
            const providedHash = hashOtp(otpStr);

            let isMatch = false;
            try {
                isMatch = crypto.timingSafeEqual(
                    Buffer.from(providedHash, "utf8"),
                    Buffer.from(record.hash, "utf8"),
                );
            } catch {
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid OTP" });
            }

            if (!isMatch) {
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid OTP" });
            }

            // FIX 3: Validate that the record contains a newEmail to apply.
            // newEmail comes from the server-stored record (set during send-otp),
            // never from the client — prevents the client from supplying an
            // arbitrary target email at verify time.
            if (!record.newEmail || typeof record.newEmail !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP session — please request a new code",
                });
            }

            // Single-use: delete before applying the update to prevent replay.
            await store.delete(`change-email:${req.patient.id}`);

            // Verify the new email is still unclaimed (race condition guard:
            // another patient could have registered it between send and verify).
            const alreadyTaken = await Patient.findOne({
                email: record.newEmail,
            }).lean();

            if (alreadyTaken) {
                return res.status(400).json({
                    success: false,
                    message:
                        "This email was claimed by another account. Please request a new code.",
                });
            }

            await Patient.updateOne(
                { _id: req.patient.id },
                { email: record.newEmail },
            );

            return res.json({
                success: true,
                message: "Email updated successfully",
            });
        } catch (err) {
            console.error("CHANGE EMAIL VERIFY ERROR:", err.message);
            return res
                .status(500)
                .json({ success: false, error: "Server error" });
        }
    },
);

module.exports = router;
