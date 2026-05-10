const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Appointment = require("../../../models/Appointment");
const Doc = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const Slot = require("../../../models/Slot");
const requireSubscription = require("../../../middleware/requiresubscription");
const cloudinary = require("../../config/cloudinary");

// HELPER: Extract public_id from Cloudinary URL
const extractPublicId = (url) => {
    if (!url || typeof url !== "string") return null;

    const parts = url.split("/upload/");
    if (parts.length < 2) return null;

    let path = parts[1];

    // remove version (v123/)
    path = path.replace(/^v\d+\//, "");

    // remove transformations (fl_attachment etc.)
    path = path
        .split("/")
        .filter((p) => !p.startsWith("fl_"))
        .join("/");

    return path;
};

// HELPER: Collect all image URLs safely
const collectVisitImageUrls = (visit) => {
    const seen = new Set();
    const urls = [];

    const add = (url) => {
        if (url && typeof url === "string" && !seen.has(url)) {
            seen.add(url);
            urls.push(url);
        }
    };

    // legacy single image
    add(visit.image);

    // new array
    (visit.images || []).forEach(add);

    return urls;
};

// DELETE APPOINTMENT ROUTE
router.delete(
    "/delete_appointment/:appointmentId/:visitId",
    fetchuser,
    requireSubscription,
    async (req, res) => {
        try {
            const { appointmentId, visitId } = req.params;
            const doctorId = req.user.doctorId;

            // ── Validate IDs ─────────────────────
            if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid appointment ID",
                });
            }

            if (!mongoose.Types.ObjectId.isValid(visitId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid visit ID",
                });
            }

            // ── Fetch appointment (with doctor check) ─────────────────────
            const appointment = await Appointment.findOne({
                _id: appointmentId,
                doctor: doctorId,
            });

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: "Appointment not found",
                });
            }

            // ── Get visit safely ─────────────────────
            const visit = appointment.visits.id(visitId);

            if (!visit) {
                return res.status(404).json({
                    success: false,
                    message: "Visit not found",
                });
            }

            const freedSlot = visit.time;

            // DELETE CLOUDINARY FILES
            const imageObjects = visit.images || [];
            let deletedCount = 0;

            await Promise.allSettled(
                imageObjects.map(async (file) => {
                    const pid =
                        file.public_id || extractPublicId(file.url || file);
                    if (!pid) return;
                    try {
                        const result = await cloudinary.uploader.destroy(pid, {
                            resource_type:
                                file.resource_type ||
                                (file.type === "application/pdf"
                                    ? "raw"
                                    : "image"),
                        });
                        if (result.result === "ok") deletedCount++;
                    } catch (err) {
                        console.error(
                            "❌ Cloudinary delete error:",
                            pid,
                            err.message,
                        );
                    }
                }),
            );

            // Legacy single image field
            if (visit.image) {
                const pid = extractPublicId(visit.image);
                if (pid) {
                    try {
                        const result = await cloudinary.uploader.destroy(pid, {
                            resource_type: "image",
                        });
                        if (result.result === "ok") deletedCount++;
                    } catch (err) {
                        console.error(
                            "❌ Legacy image delete error:",
                            err.message,
                        );
                    }
                }
            }

            // REMOVE VISIT
            appointment.visits.pull({ _id: visitId });

            const appointmentRemoved = appointment.visits.length === 0;

            if (appointmentRemoved) {
                await Appointment.findByIdAndDelete(appointmentId);
            } else {
                await appointment.save();
            }

            if (visit.date && visit.time) {
                const dateKey =
                    typeof visit.date === "string"
                        ? visit.date
                        : new Date(visit.date).toISOString().split("T")[0];

                console.log("Deleting slot:", {
                    doctor: doctorId,
                    date: dateKey,
                    time: visit.time,
                });

                const deleted = await Slot.deleteOne({
                    doctor: doctorId,
                    date: dateKey,
                    time: visit.time,
                });

                console.log("Deleted slot result:", deleted);
            }

            // UPDATE USAGE (SAFE)
            if (deletedCount > 0) {
                await Doc.updateOne({ _id: doctorId }, [
                    {
                        $set: {
                            "usage.imageUploads": {
                                $max: [
                                    {
                                        $subtract: [
                                            "$usage.imageUploads",
                                            deletedCount,
                                        ],
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                ]);
            }

            return res.json({
                success: true,
                message: appointmentRemoved
                    ? "Visit deleted — appointment removed"
                    : "Visit deleted",
                freedSlot,
            });
        } catch (err) {
            console.error("[delete_appointment]", err);

            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    },
);

module.exports = router;
