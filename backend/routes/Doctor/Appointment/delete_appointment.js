const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
var fetchuser = require("../../../middleware/fetchuser");
const mongoose = require("mongoose");
const requireSubscription = require("../../../middleware/requiresubscription");

router.delete(
    "/delete_appointment/:appointmentId/:visitId",
    fetchuser,
    requireSubscription,
    async (req, res) => {
        try {
            const { appointmentId, visitId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
                return res
                    .status(400)
                    .json({ message: "Invalid appointment ID" });
            }
            if (!mongoose.Types.ObjectId.isValid(visitId)) {
                return res.status(400).json({ message: "Invalid visit ID" });
            }

            const appointment = await Appointment.findOne({
                _id: appointmentId,
                doctor: req.user.doctorId,
            });
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: "Appointment not found",
                });
            }

            //NOW safe to check ownership
            if (appointment.doctor.toString() !== req.user.doctorId) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            appointment.visits = appointment.visits.filter((v) => {
                if (v._id.toString() === visitId) return false;

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
