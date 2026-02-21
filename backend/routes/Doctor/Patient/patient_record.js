const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
var fetchuser = require("../../../middleware/fetchuser");

router.get("/patient_record/:patientId", fetchuser, async (req, res) => {
    try {
        const appointment = await Appointment.findOne({
            patient: req.params.patientId,
        }).lean();

        if (!appointment) {
            return res.json({
                appointmentId: null,
                visits: [],
            });
        }

        appointment.visits = appointment.visits
            .map((visit) => {
                const collected = Number(visit.collected);

                // If collected missing OR zero but status Paid → fix it
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
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
