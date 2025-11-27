const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const fetchuser = require("../middleware/fetchuser");

router.get("/fetch-all-visits", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctor: req.doc.id })
            .populate("patient", "name number")
            .populate("doctor", "name");

        const allVisits = appointments.flatMap((a) =>
            a.visits.map((v) => ({
                appointmentId: a._id,
                patientName: a.patient?.name || "Unknown",
                number: a.patient?.number || "N/A",
                doctorName: a.doctor?.name || "Unknown",
                date: v.date,
                paymentType: v.payment_type,
                invoiceNumber: v.invoiceNumber,
                amount: v.amount,
            }))
        );

        allVisits.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(allVisits);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;