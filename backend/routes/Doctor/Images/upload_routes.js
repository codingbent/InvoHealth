const express = require("express");
const router = express.Router();
const upload = require("../../../middleware/upload");
const uploadToCloudinary = require("../../../utils/uploadToCloudinary");
const fetchuser = require("../../../middleware/fetchuser");
const Doc = require("../../../models/Doc");
const Appointment = require("../../../models/Appointment");
const {
    getPricing,
    invalidatePricingCache,
} = require("../../../utils/pricingcache");
const { getSubscriptionStatus } = require("../../../utils/subscription_check");
const cloudinary = require("../../config/cloudinary");
const requireDoctor = require("../../../middleware/requireDoctor");
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 2;

router.post("/upload", fetchuser, upload.single("image"), async (req, res) => {
    try {
        // FILE CHECK
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No file uploaded",
            });
        }

        // MIME TYPE VALIDATION
        if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                error: "Invalid file type",
            });
        }

        // SIZE VALIDATION (extra safety)
        const fileSizeMB = req.file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            return res.status(400).json({
                success: false,
                error: `File too large (max ${MAX_FILE_SIZE_MB}MB)`,
            });
        }

        // FETCH DOCTOR
        const doctor = await Doc.findById(req.user.doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const status = getSubscriptionStatus(doctor.subscription);
        if (status !== "active") {
            return res
                .status(403)
                .json({ success: false, error: "Subscription expired" });
        }

        // GET PRICING
        const pricing = await getPricing();
        const plan = doctor.subscription?.plan?.toLowerCase() || "starter";

        const limit = pricing?.[plan]?.imageLimit ?? 0;
        const currentUsage = doctor.usage?.imageUploads || 0;

        // LIMIT CHECK
        if (limit !== -1 && currentUsage >= limit) {
            return res.status(403).json({
                success: false,
                error: "Image upload limit reached",
            });
        }

        // ATOMIC USAGE INCREMENT (RACE SAFE)
        const updatedDoc = await Doc.findOneAndUpdate(
            {
                _id: req.user.doctorId,
                ...(limit !== -1 && {
                    "usage.imageUploads": { $lt: limit },
                }),
            },
            { $inc: { "usage.imageUploads": 1 } },
            { new: true },
        );

        if (!updatedDoc) {
            return res.status(403).json({
                success: false,
                error: "Image upload limit reached",
            });
        }

        // UPLOAD TO CLOUDINARY
        const result = await uploadToCloudinary(req.file.buffer);

        return res.status(200).json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
        });
    } catch (error) {
        console.error("IMAGE UPLOAD ERROR:", error);
        return res.status(500).json({
            success: false,
            error: "Upload failed",
        });
    }
});

router.delete("/decrement", fetchuser, async (req, res) => {
    try {
        const doctor = await Doc.findById(req.user.doctorId);
        if (!doctor) return res.status(404).json({ success: false });

        // Only decrement if above 0 — never go negative
        if ((doctor.usage?.imageUploads || 0) > 0) {
            await Doc.findByIdAndUpdate(req.user.doctorId, {
                $inc: { "usage.imageUploads": -1 },
            });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error("Image decrement error:", err);
        return res.status(500).json({ success: false });
    }
});

router.delete(
    "/delete_image/:appointmentId/:visitId",
    fetchuser,
    requireDoctor,
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;
            const { appointmentId, visitId } = req.params;
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    error: "Appointment not found",
                });
            }

            if (appointment.doctor.toString() !== doctorId) {
                return res.status(403).json({
                    success: false,
                    error: "Unauthorized",
                });
            }
            const visit = appointment.visits.id(visitId);

            if (!visit) {
                return res.status(404).json({
                    success: false,
                    error: "Visit not found",
                });
            }
            if (!visit?.image) {
                return res.status(400).json({
                    success: false,
                    error: "No image to delete",
                });
            }

            const matches = visit.image.match(
                /\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i,
            );

            if (matches?.[1]) {
                await cloudinary.uploader.destroy(matches[1]);
            }

            visit.image = undefined;
            await appointment.save();

            await Doc.findByIdAndUpdate(doctorId, {
                $inc: { "usage.imageUploads": -1 },
            });

            return res.json({ success: true });
        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);

// DELETE /api/doctor/image/delete-cloudinary
router.delete("/delete-cloudinary", fetchuser, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl)
            return res
                .status(400)
                .json({ success: false, error: "No URL provided" });

        const matches = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/i);
        if (!matches?.[1])
            return res
                .status(400)
                .json({ success: false, error: "Invalid Cloudinary URL" });

        const publicId = matches[1];

        const cloudinary = require("../../../routes/config/cloudinary");
        await cloudinary.uploader.destroy(publicId);

        // Decrement usage
        const doc = await Doc.findById(req.user.doctorId);
        if (doc && (doc.usage?.imageUploads || 0) > 0) {
            await Doc.findByIdAndUpdate(req.user.doctorId, {
                $inc: { "usage.imageUploads": -1 },
            });
        }

        return res.json({ success: true });
    } catch (err) {
        console.error("Cloudinary delete error:", err);
        return res.status(500).json({ success: false, error: "Delete failed" });
    }
});

module.exports = router;
