const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
const fetchuser = require("../../../middleware/fetchuser");
const mongoose = require("mongoose");
const requireSubscription = require("../../../middleware/requiresubscription");
const cloudinary = require("../../config/cloudinary");

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

            // FIND VISIT
            const visit = appointment.visits.find(
                (v) => v._id.toString() === visitId,
            );

            if (!visit) {
                return res.status(404).json({
                    success: false,
                    message: "Visit not found",
                });
            }

            const freedSlot = visit.time; // CAPTURE BEFORE DELETE

            // DELETE IMAGE
            if (visit.image) {
                try {
                    const matches = visit.image.match(
                        /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i,
                    );

                    if (matches?.[1]) {
                        await cloudinary.uploader.destroy(matches[1]);
                    }
                } catch (err) {
                    console.error("Cloudinary delete error:", err);
                }
            }

            // REMOVE VISIT
            appointment.visits = appointment.visits.filter(
                (v) => v._id.toString() !== visitId,
            );

            // DELETE APPOINTMENT IF EMPTY
            if (appointment.visits.length === 0) {
                await Appointment.findByIdAndDelete(appointmentId);

                return res.json({
                    success: true,
                    message: "Visit deleted — appointment removed",
                    freedSlot, // IMPORTANT
                });
            }

            await appointment.save();

            res.json({
                success: true,
                message: "Visit deleted",
                freedSlot, // IMPORTANT
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: "Server error" });
        }
    },
);

module.exports = router;
