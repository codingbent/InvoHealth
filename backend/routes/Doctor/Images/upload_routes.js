const express = require("express");
const router = express.Router();
const upload = require("../../../middleware/upload");
const uploadToCloudinary = require("../../../utils/uploadToCloudinary");
const fetchuser = require("../../../middleware/fetchuser");
const Doc = require("../../../models/Doc");
const {
    getPricing,
    invalidatePricingCache,
} = require("../../../utils/pricingcache");
const { getSubscriptionStatus } = require("../../../utils/subscription_check");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const MAX_FILE_SIZE_MB = 2;

router.post("/", fetchuser, upload.single("image"), async (req, res) => {
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

module.exports = router;
