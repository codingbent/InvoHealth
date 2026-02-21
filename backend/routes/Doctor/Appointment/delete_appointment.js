const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
var fetchuser = require("../../../middleware/fetchuser");

router.delete(
    "/delete_appointment/:appointmentId/:visitId",
    fetchuser,
    async (req, res) => {
        try {
            const { appointmentId, visitId } = req.params;

            const appointment = await Appointment.findById(appointmentId);
            if (!appointment)
                return res
                    .status(404)
                    .json({ message: "Appointment not found" });

            // Remove visit
            appointment.visits = appointment.visits.filter(
                (v) => v._id.toString() !== visitId,
            );

            // 🛑 NEW FIX: Also remove broken/empty visits
            appointment.visits = appointment.visits.filter((v) => {
                const isEmptyVisit =
                    (!v.service || v.service.length === 0) &&
                    (!v.amount || v.amount === 0);

                return !isEmptyVisit;
            });

            // If no visits left → delete appointment
            if (appointment.visits.length === 0) {
                await Appointment.findByIdAndDelete(appointmentId);
                return res.json({
                    success: true,
                    message:
                        "Visit deleted — appointment removed (no visits left)",
                });
            }

            await appointment.save();
            res.json({ success: true, message: "Visit deleted" });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    },
);

module.exports = router;
