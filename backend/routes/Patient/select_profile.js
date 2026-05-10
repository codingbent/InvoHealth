const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Patient = require("../../models/Patient");
const jwt = require("jsonwebtoken");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { store } = require("../../utils/otpUtils");

const selectProfileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: (req) => ipKeyGenerator(req),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) =>
        res.status(429).json({
            success: false,
            error: "Too many attempts. Please request a new OTP and try again.",
        }),
});

router.post("/select_profile", selectProfileLimiter, async (req, res) => {
    try {
        const { patientId, email } = req.body;

        if (!patientId || !email)
            return res
                .status(400)
                .json({ success: false, error: "Missing data" });

        if (!mongoose.Types.ObjectId.isValid(patientId))
            return res
                .status(400)
                .json({ success: false, error: "Invalid patient ID format" });

        const cleanEmail = email.toLowerCase().trim();

        // ── Path 1: already-logged-in patient switching profile ───────────────
        // If a valid patient JWT is present, use it as proof instead of OTP flag.
        let authorized = false;
        const authToken = req.headers["auth-token"];

        if (authToken) {
            try {
                const decoded = jwt.verify(authToken, process.env.JWT_SECRET, {
                    algorithms: ["HS256"],
                });

                if (decoded?.patient?.role === "patient") {
                    // Confirm the current patient's email matches the target email
                    // — prevents switching to a profile on a different email
                    const currentPatient = await Patient.findById(
                        decoded.patient.id,
                    )
                        .select("email")
                        .lean();

                    if (currentPatient?.email === cleanEmail) {
                        authorized = true;
                    }
                }
            } catch {
                // invalid/expired token — fall through to OTP flag check
            }
        }

        // ── Path 2: initial login — must have OTP flag ────────────────────────
        if (!authorized) {
            const flagKey = `profile-select:${cleanEmail}`;
            const flag = await store.get(flagKey);

            if (!flag) {
                return res.status(403).json({
                    success: false,
                    error: "OTP verification required. Please log in again.",
                });
            }

            await store.delete(flagKey);
        }

        // ── Verify patientId belongs to this email (both paths) ───────────────
        const patient = await Patient.findById(patientId);

        if (!patient || patient.email !== cleanEmail) {
            return res.status(403).json({
                success: false,
                error: "Unauthorized profile access",
            });
        }

        // ── Issue JWT ─────────────────────────────────────────────────────────
        const token = jwt.sign(
            { patient: { id: patient._id, role: "patient" } },
            process.env.JWT_SECRET,
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
        console.error("SELECT PROFILE ERROR:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
