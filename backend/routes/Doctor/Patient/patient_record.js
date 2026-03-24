const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
const Patient = require("../../../models/Patient");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/patient_record/:patientId", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId;

        const appointment = await Appointment.findOne({
            patient: req.params.patientId,
            doctor: doctorId,
        }).lean();

        const patient = await Patient.findById(req.params.patientId).lean();

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        //  SECURITY: ensure doctor owns patient
        if (patient.doctor.toString() !== doctorId) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        //  Mask number (clean + future-proof)
        const maskedNumber = patient.numberLast4
            ? `******${patient.numberLast4}`
            : patient.number
              ? `******${patient.number.slice(-4)}`
              : "";

        //  Remove sensitive fields (VERY IMPORTANT)
        delete patient.number;
        delete patient.numberHash;
        delete patient.numberEncrypted;

        if (!appointment) {
            return res.json({
                appointmentId: null,
                visits: [],
                patient: {
                    name: patient.name,
                    numberMasked: maskedNumber,
                    age: patient.age,
                    gender: patient.gender,
                },
            });
        }

        // Normalize visits
        appointment.visits = appointment.visits
            .map((visit) => {
                const collected = Number(visit.collected);

                if (
                    visit.collected === undefined ||
                    (collected === 0 && visit.status === "Paid")
                ) {
                    return {
                        ...visit,
                        collected: visit.amount,
                        remaining: 0,
                        status: "Paid",
                    };
                }

                return visit;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({
            appointmentId: appointment._id,
            visits: appointment.visits,
            patient: {
                name: patient.name,
                numberMasked: maskedNumber,
                age: patient.age,
                gender: patient.gender,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
