const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Doc = require("../../models/Doc");
const Timing = require("../../models/Timing");
const Service = require("../../models/Service");
const Appointment = require("../../models/Appointment");
const Patient = require("../../models/Patient");
const fetchPatient = require("../../middleware/fetchpatient");
const { decrypt } = require("../../utils/crypto");

// ── GET /api/patient/doctor/:doctorId ──────────────────────────────────────
router.get("/doctor/:doctorId", fetchPatient, async (req, res) => {
    try {
        const { doctorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid doctor ID" });
        }

        // SECURITY: patient must have an existing appointment with this doctor
        const exists = await Appointment.exists({
            patient: req.patient.id,
            doctor: doctorId,
        });

        if (!exists) {
            return res
                .status(403)
                .json({ success: false, error: "Access denied" });
        }

        // Fetch doctor profile + services in parallel
        const [doc, services] = await Promise.all([
            Doc.findById(doctorId)
                .select(
                    "name email clinicName phoneEncrypted appointmentPhoneEncrypted phoneLast4 degree regNumber address specialization",
                )
                .populate(
                    "address.countryId",
                    "name dialCode currency symbol code",
                ),

            Service.find({ doctor: doctorId }).select("_id name amount").lean(),
        ]);

        if (!doc) {
            return res
                .status(404)
                .json({ success: false, error: "Doctor not found" });
        }

        let phone = "";
        let appointment = "";
        try {
            if (doc.phoneEncrypted) phone = decrypt(doc.phoneEncrypted);
            if (doc.appointmentPhoneEncrypted)
                appointment = decrypt(doc.appointmentPhoneEncrypted);
        } catch (err) {
            console.error("Decrypt error:", err.message);
        }

        const country = doc.address?.countryId || {};

        return res.json({
            success: true,
            doctor: {
                id: doc._id,
                name: doc.name || "",
                email: doc.email || "",
                clinicName: doc.clinicName || "",

                phone,
                appointment,
                phoneMasked: doc.phoneLast4 ? `******${doc.phoneLast4}` : "",

                degree: doc.degree || [],
                specialization: doc.specialization || [],
                regNumber: doc.regNumber || "",

                address: {
                    line1: doc.address?.line1 || "",
                    line2: doc.address?.line2 || "",
                    line3: doc.address?.line3 || "",
                    city: doc.address?.city || "",
                    state: doc.address?.state || "",
                    pincode: doc.address?.pincode || "",
                    country: country.name || "",
                    dialCode: country.dialCode || "",
                    currency: country.currency || "",
                    currencySymbol: country.symbol || "",
                    countryCode: country.code || "",
                },

                // ← NEW: services offered (for BookingModal dropdown)
                services: services.map((s) => ({
                    _id: s._id,
                    name: s.name,
                    amount: s.amount ?? null,
                })),
            },
        });
    } catch (err) {
        console.error("GET PATIENT DOCTOR ERROR:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

// ── GET /api/patient/doctor/:doctorId/availability ─────────────────────────
router.get("/doctor/:doctorId/availability", fetchPatient, async (req, res) => {
    try {
        const { doctorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid doctor ID" });
        }

        // SECURITY: patient must be linked to this doctor
        const patient = await Patient.findOne({
            _id: req.patient.id,
            doctors: new mongoose.Types.ObjectId(doctorId),
        }).lean();

        if (!patient) {
            return res
                .status(403)
                .json({ success: false, error: "Access denied" });
        }

        const data = await Timing.findOne({ doctorId }).lean();

        return res.json({
            success: true,
            availability: data?.availability || [],
        });
    } catch (error) {
        console.error("AVAILABILITY ERROR:", error);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
