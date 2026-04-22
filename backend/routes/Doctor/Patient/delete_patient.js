const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const requireSubscription = require("../../../middleware/requireSubscription");

router.delete(
    "/delete_patient/:id",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const patientId = req.params.id;

            const patient = await Patient.findById(patientId).session(session);

            if (!patient) {
                await session.abortTransaction();
                return res
                    .status(404)
                    .json({ success: false, message: "Not found" });
            }

            if (patient.doctor.toString() !== req.user.doctorId) {
                await session.abortTransaction();
                return res
                    .status(403)
                    .json({ success: false, message: "Unauthorized" });
            }

            // Clean appointments FIRST
            const appointments = await Appointment.find({
                patient: patientId,
            }).session(session);

            for (let a of appointments) {
                a.visits = a.visits.filter((v) => {
                    const isEmptyVisit =
                        (!v.service || v.service.length === 0) &&
                        (!v.amount || v.amount === 0);
                    return !isEmptyVisit;
                });

                if (a.visits.length === 0) {
                    await Appointment.deleteOne({ _id: a._id }).session(
                        session,
                    );
                } else {
                    await a.save({ session });
                }
            }

            // Delete patient LAST
            await Patient.deleteOne({ _id: patientId }).session(session);

            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message: "Patient and related appointments deleted",
            });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();

            console.error(err);
            res.status(500).json({ success: false, message: "Server error" });
        }
    },
);

module.exports = router;
