const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/export_appointments", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({
            doctor: req.user.id, // ✅ FIXED (you were using doctorId)
        }).populate("patient");

        const allVisits = [];

        appointments.forEach((appt) => {
            if (!appt.patient) return;

            appt.visits.forEach((visit) => {
                const billed = Number(visit.amount ?? 0);
                const collected = Number(visit.collected ?? billed);
                const remaining = billed - collected;

                const status =
                    remaining <= 0
                        ? "Paid"
                        : collected > 0
                          ? "Partial"
                          : "Unpaid";

                allVisits.push({
                    patientId: appt.patient._id,
                    name: appt.patient.name,
                    number: appt.patient.number || "",
                    gender: appt.patient.gender || "",

                    date: visit.date,
                    payment_type: visit.payment_type || "Other",

                    amount: billed,
                    collected: collected,
                    remaining: remaining,
                    status: status,

                    discount: visit.discount || 0, // optional
                    isPercent: visit.isPercent || false,

                    services: visit.service || [],
                    invoiceNumber: visit.invoiceNumber || "",
                });
            });
        });

        allVisits.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json(allVisits);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
