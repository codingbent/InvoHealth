const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const Patient = require("../models/Patient");
const Doc = require("../models/Doc");

// 📅 Route: Fetch all visits (flattened)
router.get("/fetch-all-visits", async (req, res) => {
  try {
    // Populate patient + doctor for names
    const appointments = await Appointment.find()
      .populate("patient", "name") // only get patient name
      .populate("doctor", "name"); // only get doctor name

    // Flatten visits into one array
    const allVisits = appointments.flatMap((appointment) =>
      appointment.visits.map((visit) => ({
        patientName: appointment.patient?.name || "Unknown",
        doctorName: appointment.doctor?.name || "Unknown",
        date: visit.date,
        paymentType: visit.payment_type,
        invoiceNumber: visit.invoiceNumber,
        amount: visit.amount,
      }))
    );

    // Sort by date (newest first)
    allVisits.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(allVisits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching appointments" });
  }
});

module.exports = router;