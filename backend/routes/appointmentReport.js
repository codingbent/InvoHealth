// GET /api/report/fetch-all-visits
const express = require("express");
const router = express.Router();
router.get("/fetch-all-visits", async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("patient", "name number")
      .populate("doctor", "name");

    const allVisits = appointments.flatMap((a) =>
      a.visits.map((v) => ({
        _id: a._id,
        patientName: a.patient?.name || "Unknown",
        number: a.patient?.number || "N/A",
        doctorName: a.doctor?.name || "Unknown",
        date: v.date,
        paymentType: v.payment_type,
        invoiceNumber: v.invoiceNumber,
        amount: v.amount,
      }))
    );

    // Sort by latest date first
    allVisits.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json(allVisits);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
