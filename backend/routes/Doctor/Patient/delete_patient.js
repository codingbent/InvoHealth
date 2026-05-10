const mongoose = require("mongoose");
const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const Doc = require("../../../models/Doc");
const Slot = require("../../../models/Slot");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const cloudinary = require("../../config/cloudinary");

const extractPublicId = (url) => {
    if (!url || typeof url !== "string") return null;
    const m = url.match(/\/upload\/(?:v\d+\/)?(.+)$/i);
    return m?.[1] ?? null;
};

const collectVisitImageUrls = (visit) => {
    const seen = new Set();
    const urls = [];

    const add = (url) => {
        if (url && typeof url === "string" && !seen.has(url)) {
            seen.add(url);
            urls.push(url);
        }
    };

    add(visit.image);
    (visit.images || []).forEach(add);

    return urls;
};

router.delete(
    "/delete_patient/:id",
    fetchuser,
    requireDoctor,
    async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const patientId = req.params.id;
            const doctorId = req.user.doctorId?.toString();

            const patient = await Patient.findById(patientId).session(session);

            if (!patient) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: "Patient not found",
                });
            }

            //  SUPPORT BOTH OLD + NEW SCHEMA
            const isOwner =
                (Array.isArray(patient.doctors) &&
                    patient.doctors.some((d) => d.toString() === doctorId)) ||
                (patient.doctor && patient.doctor.toString() === doctorId);

            if (!isOwner) {
                await session.abortTransaction();
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            // ─────────────────────────────────────────────
            // STEP 1: DELETE ONLY THIS DOCTOR'S APPOINTMENTS
            // ─────────────────────────────────────────────
            const appointments = await Appointment.find({
                patient: patientId,
                doctor: doctorId,
            }).session(session);

            let deletedImagesCount = 0;

            for (let a of appointments) {
                for (let v of a.visits) {
                    const imageObjects = v.images || [];

                    await Promise.allSettled(
                        imageObjects.map(async (file) => {
                            const pid =
                                file.public_id ||
                                extractPublicId(file.url || file);

                            if (!pid) return;

                            const result = await cloudinary.uploader.destroy(
                                pid,
                                {
                                    resource_type:
                                        file.resource_type ||
                                        (file.type === "application/pdf"
                                            ? "raw"
                                            : "image"),
                                },
                            );

                            if (result.result === "ok") deletedImagesCount++;
                        }),
                    );

                    if (v.date && v.time) {
                        await Slot.deleteOne({
                            doctor: doctorId,
                            date:
                                typeof v.date === "string"
                                    ? v.date
                                    : new Date(v.date)
                                          .toISOString()
                                          .split("T")[0],
                            time: v.time,
                        }).session(session);
                    }

                    // legacy image
                    if (v.image) {
                        const pid = extractPublicId(v.image);
                        if (pid) {
                            const result = await cloudinary.uploader.destroy(
                                pid,
                                {
                                    resource_type: "image",
                                },
                            );
                            if (result.result === "ok") deletedImagesCount++;
                        }
                    }
                }

                // DELETE FULL APPOINTMENT (since 1 doc per appointment)
                await Appointment.deleteOne({ _id: a._id }).session(session);
            }

            // ─────────────────────────────────────────────
            // STEP 2: UPDATE DOCTOR USAGE
            // ─────────────────────────────────────────────
            if (deletedImagesCount > 0) {
                await Doc.updateOne(
                    { _id: doctorId },
                    [
                        {
                            $set: {
                                "usage.imageUploads": {
                                    $max: [
                                        {
                                            $subtract: [
                                                "$usage.imageUploads",
                                                deletedImagesCount,
                                            ],
                                        },
                                        0,
                                    ],
                                },
                            },
                        },
                    ],
                    { session },
                );
            }

            // ─────────────────────────────────────────────
            // STEP 3: REMOVE DOCTOR OR DELETE PATIENT
            // ─────────────────────────────────────────────
            if (Array.isArray(patient.doctors)) {
                if (patient.doctors.length > 1) {
                    //  REMOVE ONLY THIS DOCTOR
                    await Patient.updateOne(
                        { _id: patientId },
                        { $pull: { doctors: doctorId } },
                        { session },
                    );
                } else {
                    //  DELETE PATIENT
                    await Patient.deleteOne({ _id: patientId }).session(
                        session,
                    );
                }
            } else {
                // old schema → delete
                await Patient.deleteOne({ _id: patientId }).session(session);
            }

            await session.commitTransaction();
            session.endSession();

            return res.json({
                success: true,
                message:
                    "Patient removed from doctor (or deleted if last doctor)",
            });
        } catch (err) {
            await session.abortTransaction();
            session.endSession();

            console.error("Delete patient error:", err);

            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    },
);

module.exports = router;
