const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Appointment = require("../../../models/Appointment");
const Patient = require("../../../models/Patient");
const fetchuser = require("../../../middleware/fetchuser");

router.get("/patient_record/:patientId", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId?.toString();
        const patientId = req.params.patientId;

        //  Validate ID
        if (!mongoose.Types.ObjectId.isValid(patientId)) {
            return res.status(400).json({ message: "Invalid patient ID" });
        }

        //  Fetch both in parallel (faster)
        const [appointment, patient] = await Promise.all([
            Appointment.findOne({
                patient: patientId,
                doctor: doctorId,
            }).lean(),

            Patient.findById(patientId)
                .select("-number -numberHash -numberEncrypted")
                .lean(),
        ]);

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        //  SUPPORT BOTH OLD + NEW SCHEMA
        const isAuthorized =
            (Array.isArray(patient.doctors) &&
                patient.doctors.some((d) => d.toString() === doctorId)) ||
            (patient.doctor && patient.doctor.toString() === doctorId);

        if (!isAuthorized) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        //  Safe masked number
        const maskedNumber = patient.numberLast4
            ? `******${patient.numberLast4}`
            : "";

        //  Base patient object (consistent shape ALWAYS)
        const patientSafe = {
            name: patient.name || "",
            age: patient.age ?? null,
            gender: patient.gender || "",
            numberMasked: maskedNumber,
        };

        //  No appointment case
        if (!appointment) {
            return res.json({
                appointmentId: null,
                visits: [],
                patient: patientSafe,
            });
        }

        //  Normalize visits (safe)
        const normalizedVisits = (appointment.visits || [])
            .map((visit) => {
                const collected = Number(visit.collected ?? 0);
                const amount = Number(visit.amount ?? 0);

                if (
                    visit.collected === undefined ||
                    (collected === 0 && visit.status === "Paid")
                ) {
                    return {
                        ...visit,
                        collected: amount,
                        remaining: 0,
                        status: "Paid",
                    };
                }

                return visit;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.json({
            appointmentId: appointment._id,
            visits: normalizedVisits,
            patient: patientSafe,
        });
    } catch (err) {
        console.error("patient_record error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
