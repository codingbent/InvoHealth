const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();

const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const Doc = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const requireSubscription = require("../../../middleware/requiresubscription");

const cloudinary = require("../../config/cloudinary");

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

            // STEP 1: Get all appointments
            const appointments = await Appointment.find({
                patient: patientId,
            }).session(session);

            // STEP 2: Delete all Cloudinary images FIRST
            // STEP 2: Delete all Cloudinary images + COUNT THEM
            let deletedImagesCount = 0;

            for (let a of appointments) {
                for (let v of a.visits) {
                    if (v.image) {
                        try {
                            const matches = v.image.match(
                                /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i,
                            );

                            if (matches?.[1]) {
                                await cloudinary.uploader.destroy(matches[1]);
                                deletedImagesCount++;
                            }
                        } catch (err) {
                            console.error(
                                "Cloudinary delete error:",
                                err.message,
                            );
                        }
                    }
                }
            }

            // STEP 3: Clean appointments
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

            // STEP 4: UPDATE USAGE
            if (deletedImagesCount > 0) {
                await Doc.findByIdAndUpdate(
                    req.user.doctorId,
                    {
                        $inc: {
                            "usage.imageUploads": -deletedImagesCount,
                        },
                    },
                    { session },
                );
            }
            // STEP 5: Delete patient LAST
            await Patient.deleteOne({ _id: patientId }).session(session);

            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message:
                    "Patient, appointments, and images deleted successfully",
            });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();

            console.error("Delete patient error:", err);

            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    },
);

module.exports = router;
