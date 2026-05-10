const express = require("express");
const router = express.Router();
const Appointment = require("../../models/Appointment");
const fetchPatient = require("../../middleware/fetchpatient");
const mongoose = require("mongoose");

// GET /api/patient/visits/:doctorId
router.get("/visits/:doctorId", fetchPatient, async (req, res) => {
    try {
        const { doctorId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(doctorId)) {
            return res
                .status(400)
                .json({ success: false, error: "Invalid doctor ID" });
        }

        // Ownership enforced: patient from JWT must match appointment.patient
        const appointmentDoc = await Appointment.findOne({
            patient: req.patient.id,
            doctor: doctorId,
        });

        if (!appointmentDoc || !appointmentDoc.visits.length) {
            return res.json({ success: true, visits: [] });
        }

        const visits = appointmentDoc.visits
            .map((v) => {
                let finalDate = new Date(v.date);

                if (v.time) {
                    const parts = v.time.split(":");
                    const hours = parseInt(parts[0], 10);
                    const minutes = parseInt(parts[1], 10);
                    if (!isNaN(hours) && !isNaN(minutes)) {
                        finalDate.setHours(hours, minutes, 0, 0);
                    }
                }

                return {
                    _id: v._id,
                    date: finalDate,
                    // FIX: return full service array (not joined string) so the
                    // client PDF generator can iterate services individually
                    service: v.service || [],
                    amount: v.amount ?? 0,
                    discount: v.discount ?? 0,
                    isPercent: v.isPercent ?? false,
                    collected: v.collected ?? 0,
                    remaining: v.remaining ?? 0,
                    status: v.status,
                    invoiceNumber: v.invoiceNumber,
                };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.json({ success: true, visits });
    } catch (err) {
        console.error("VISITS ERROR:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports = router;
