const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment")
var fetchuser = require("../../../middleware/fetchuser");

router.get("/booked_slots", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.id;
        const { date } = req.query;

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const appointments = await Appointment.find({
            doctor:doctorId,
            "visits.date": { $gte: start, $lte: end },
        });

        const bookedSlots = [];

        appointments.forEach((appt) => {
            appt.visits.forEach((v) => {
                const sameDay =
                    new Date(v.date).toDateString() ===
                    new Date(date).toDateString();

                if (sameDay && v.time) {
                    bookedSlots.push(v.time);
                }
            });
        });

        res.json({
            success: true,
            slots: bookedSlots,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Server error" });
    }
});

module.exports=router;