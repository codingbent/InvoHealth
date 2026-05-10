const express = require("express");
const router = express.Router();
const Appointment = require("../../models/Appointment");
const fetchPatient = require("../../middleware/fetchpatient");

router.get("/records", fetchPatient, async (req, res) => {
    try {
        const patientId = req.patient.id;

        const appointments = await Appointment.find({
            patient: patientId,
        })
            .populate({
                path: "doctor",
                model: "Doc",
                select: "name specialization doctorType"
            })
            .lean();

        const records = [];

        for (const appt of appointments) {
            for (const v of appt.visits || []) {
                if (v.images && v.images.length > 0) {
                    records.push({
                        _id: `${appt._id}_${v.invoiceNumber}`,
                        date: v.date,
                        images: v.images,
                        doctor: appt.doctor
                            ? {
                                  name: appt.doctor.name,
                                  specialization:
                                      appt.doctor.specialization || [],
                                  type: appt.doctor.doctorType || [],
                              }
                            : {
                                  name: "Unknown Doctor",
                                  specialization: [],
                                  type: [],
                              },
                    });
                }
            }
        }

        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        return res.json({
            success: true,
            records,
        });
    } catch (err) {
        console.error("GET RECORDS ERROR:", err);
        return res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
