const express = require("express");
const router = express.Router();

const upload = require("../../../middleware/upload");
const uploadToCloudinary = require("../../../utils/uploadToCloudinary");
const fetchuser = require("../../../middleware/fetchuser");
const requireDoctor = require("../../../middleware/requireDoctor");
const Doc = require("../../../models/Doc");
const Appointment = require("../../../models/Appointment");
const { getPricing } = require("../../../utils/pricingcache");
const { getSubscriptionStatus } = require("../../../utils/subscription_check");
const cloudinary = require("../../config/cloudinary");
const requireSubscription = require("../../../middleware/requiresubscription");
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
];
const MAX_IMG_MB = 2;
const MAX_PDF_MB = 2;

// ─── Helpers ───────────────────────────────────────────────────────────────

const extractPublicId = (url) => {
    if (!url || typeof url !== "string") return null;
    const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z0-9]+$/i);
    return m?.[1] ?? null;
};

const getMaxSizeMB = (mimetype) =>
    mimetype === "application/pdf" ? MAX_PDF_MB : MAX_IMG_MB;

/** Validate MIME type and file size; return error string or null. */
const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.mimetype))
        return `Invalid file type: ${file.originalname}`;
    const limitMB = getMaxSizeMB(file.mimetype);
    if (file.size / (1024 * 1024) > limitMB)
        return `File too large (max ${limitMB}MB): ${file.originalname}`;
    return null;
};

/** Read doctor + pricing in one go and validate subscription. */
const getDoctorAndLimits = async (doctorId) => {
    const doctor = await Doc.findById(doctorId);
    if (!doctor) return { error: "Doctor not found", status: 404 };

    const subStatus = getSubscriptionStatus(doctor.subscription);
    if (subStatus !== "active")
        return { error: "Subscription expired", status: 403 };

    const pricing = await getPricing();
    if (!pricing) return { error: "Pricing config unavailable", status: 500 };

    const plan = doctor.subscription?.plan?.toLowerCase() || "starter";
    const limit = pricing[plan]?.imageLimit ?? 0;

    return { doctor, limit };
};

/** Atomically increment usage. Returns false if limit would be exceeded. */
const incrementUsage = async (doctorId, count, limit) => {
    const query = {
        _id: doctorId,
        ...(limit !== -1 && { "usage.imageUploads": { $lte: limit - count } }),
    };
    const updated = await Doc.findOneAndUpdate(
        query,
        { $inc: { "usage.imageUploads": count } },
        { new: true },
    );
    return updated !== null;
};

/** Atomically decrement usage, never below 0. */
const decrementUsage = async (doctorId, count) =>
    Doc.updateOne({ _id: doctorId }, [
        {
            $set: {
                "usage.imageUploads": {
                    $max: [{ $subtract: ["$usage.imageUploads", count] }, 0],
                },
            },
        },
    ]);

/** Add fl_attachment transformation for PDFs so browsers download, not display. */
const applyPdfTransform = (url, mimetype) =>
    mimetype === "application/pdf"
        ? url.replace("/upload/", "/upload/fl_attachment/")
        : url;

// ─── POST /upload  (single file) ──────────────────────────────────────────
router.post(
    "/upload",
    fetchuser,
    requireSubscription,
    upload.single("image"),
    async (req, res) => {
        try {
            if (!req.file)
                return res
                    .status(400)
                    .json({ success: false, error: "No file uploaded" });

            const fileError = validateFile(req.file);
            if (fileError)
                return res
                    .status(400)
                    .json({ success: false, error: fileError });

            const result = await getDoctorAndLimits(req.user.doctorId);
            if (result.error)
                return res
                    .status(result.status)
                    .json({ success: false, error: result.error });

            const { limit } = result;
            const ok = await incrementUsage(req.user.doctorId, 1, limit);
            if (!ok)
                return res.status(403).json({
                    success: false,
                    error: "Image upload limit reached",
                });

            let cloudResult;
            try {
                cloudResult = await uploadToCloudinary(
                    req.file.buffer,
                    req.file.mimetype,
                );
            } catch (err) {
                await decrementUsage(req.user.doctorId, 1); // roll back
                console.error("[upload] Cloudinary error:", err);
                return res
                    .status(502)
                    .json({ success: false, error: "Upload failed" });
            }

            return res.status(200).json({
                success: true,
                url: applyPdfTransform(
                    cloudResult.secure_url,
                    req.file.mimetype,
                ),
                public_id: cloudResult.public_id,
                type: req.file.mimetype,
            });
        } catch (err) {
            console.error("[upload]", err);
            return res
                .status(500)
                .json({ success: false, error: "Upload failed" });
        }
    },
);

// ─── POST /upload-multi  (up to 10 files) ─────────────────────────────────
router.post(
    "/upload-multi",
    fetchuser,
    requireSubscription,
    upload.array("images", 10),
    async (req, res) => {
        try {
            const files = req.files || [];
            if (!files.length)
                return res
                    .status(400)
                    .json({ success: false, error: "No files uploaded" });

            // Validate all files before touching the DB
            for (const file of files) {
                const err = validateFile(file);
                if (err)
                    return res.status(400).json({ success: false, error: err });
            }

            const result = await getDoctorAndLimits(req.user.doctorId);
            if (result.error)
                return res
                    .status(result.status)
                    .json({ success: false, error: result.error });

            const { limit } = result;
            const uploadCount = files.length;

            const ok = await incrementUsage(
                req.user.doctorId,
                uploadCount,
                limit,
            );
            if (!ok)
                return res.status(403).json({
                    success: false,
                    error: "Image upload limit reached",
                });

            // BUG FIX: was using Promise.all (throws on first failure) and had
            // a dead catch block because allSettled never rejects.
            // Now: allSettled + partial rollback of both Cloudinary and usage counter.
            const settled = await Promise.allSettled(
                files.map((f) => uploadToCloudinary(f.buffer, f.mimetype)),
            );

            const successful = settled
                .map((r, i) =>
                    r.status === "fulfilled"
                        ? { result: r.value, file: files[i] }
                        : null,
                )
                .filter(Boolean);

            const failCount = settled.length - successful.length;

            if (failCount > 0) {
                console.error(
                    `[upload-multi] ${failCount}/${uploadCount} uploads failed`,
                );

                // Roll back: delete successful Cloudinary assets + decrement usage
                await Promise.allSettled(
                    successful.map(({ result: r }) =>
                        cloudinary.uploader.destroy(r.public_id),
                    ),
                );
                await decrementUsage(req.user.doctorId, uploadCount); // full rollback

                return res.status(502).json({
                    success: false,
                    error: `${failCount} file(s) failed to upload. No files were saved.`,
                });
            }

            // BUG FIX: original code referenced `result` and `req.file` which don't
            // exist in an array-upload route — removed those four dead lines entirely.
            return res.status(200).json({
                success: true,
                images: successful.map(({ result: r, file: f }) => ({
                    url: applyPdfTransform(r.secure_url, f.mimetype),
                    public_id: r.public_id,
                    type: f.mimetype,
                })),
            });
        } catch (err) {
            console.error("[upload-multi]", err);
            return res
                .status(500)
                .json({ success: false, error: "Upload failed" });
        }
    },
);

// ─── DELETE /decrement  (single, atomic) ──────────────────────────────────
router.delete("/decrement", fetchuser, async (req, res) => {
    try {
        await decrementUsage(req.user.doctorId, 1);
        return res.json({ success: true });
    } catch (err) {
        console.error("[decrement]", err);
        return res.status(500).json({ success: false });
    }
});

// ─── DELETE /decrement-multi  (batch, atomic) ─────────────────────────────
router.delete("/decrement-multi", fetchuser, async (req, res) => {
    try {
        const count = Math.max(Number(req.body?.count) || 1, 1);
        await decrementUsage(req.user.doctorId, count);
        return res.json({ success: true });
    } catch (err) {
        console.error("[decrement-multi]", err);
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
            const { imageUrl } = req.body;

            const appointment = await Appointment.findById(appointmentId);
            if (!appointment)
                return res
                    .status(404)
                    .json({ success: false, error: "Appointment not found" });
            if (appointment.doctor.toString() !== doctorId)
                return res
                    .status(403)
                    .json({ success: false, error: "Unauthorized" });

            const visit = appointment.visits.id(visitId);
            if (!visit)
                return res
                    .status(404)
                    .json({ success: false, error: "Visit not found" });

            // ── Migrate legacy field into images[] on first touch ──────────
            // BUG FIX: original compared string against [{url,type}] objects,
            // so includes() always returned false → duplicate entries every call.
            // Schema is now [String] so this comparison is correct.
            if (visit.image && !visit.images.includes(visit.image)) {
                visit.images.push(visit.image);
                visit.image = "";
            }

            let decrementBy = 0;

            if (imageUrl) {
                const imageObj = visit.images.find((img) =>
                    typeof img === "string"
                        ? img === imageUrl
                        : img.url === imageUrl,
                );

                // Extract public_id
                const publicId =
                    typeof imageObj === "string"
                        ? extractPublicId(imageObj)
                        : imageObj?.public_id || extractPublicId(imageUrl);

                // Detect resource type (PDF vs Image)
                const isPDF =
                    (typeof imageObj === "object" &&
                        (imageObj?.type === "application/pdf" ||
                            imageObj?.resource_type === "raw")) ||
                    imageUrl.toLowerCase().endsWith(".pdf") ||
                    imageUrl.includes("/raw/upload");

                const resourceType = isPDF ? "raw" : "image";
                // Delete from Cloudinary
                if (publicId) {
                    try {
                        await cloudinary.uploader.destroy(publicId, {
                            resource_type: resourceType,
                            invalidate: true,
                        });
                    } catch (e) {
                        console.error("[delete_image] Cloudinary error:", e);
                    }
                }

                // Remove from DB (supports both formats)
                visit.images = visit.images.filter((img) =>
                    typeof img === "string"
                        ? img !== imageUrl
                        : img.url !== imageUrl,
                );

                // Clean legacy field
                if (visit.image === imageUrl) visit.image = "";

                decrementBy = 1;
            } else {
                // ── Delete ALL images on this visit ────────────────────────
                const allObjects = [...visit.images];
                await Promise.allSettled(
                    allObjects.map((img) => {
                        const pid =
                            img.public_id || extractPublicId(img.url || img);
                        const rt =
                            typeof img === "object" &&
                            img.type === "application/pdf"
                                ? "raw"
                                : (img.url || img)
                                        .toLowerCase()
                                        .endsWith(".pdf")
                                  ? "raw"
                                  : "image";
                        return pid
                            ? cloudinary.uploader.destroy(pid, {
                                  resource_type: rt,
                              })
                            : Promise.resolve(null);
                    }),
                );
                decrementBy = allObjects.length;
                visit.images = [];
                visit.image = "";
            }

            await appointment.save();

            if (decrementBy > 0) {
                await decrementUsage(doctorId, decrementBy);
            }

            return res.json({ success: true });
        } catch (err) {
            console.error("[delete_image]", err);
            return res
                .status(500)
                .json({ success: false, error: "Server error" });
        }
    },
);

// ─── DELETE /delete-cloudinary  ───────────────────────────────────────────
// Deletes a Cloudinary asset by URL.
// SECURITY FIX: verifies ownership before deleting.
router.delete("/delete-cloudinary", fetchuser, async (req, res) => {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl)
            return res
                .status(400)
                .json({ success: false, error: "No URL provided" });

        const publicId = extractPublicId(imageUrl);
        if (!publicId)
            return res
                .status(400)
                .json({ success: false, error: "Invalid Cloudinary URL" });

        const ownsAsset = await Appointment.exists({
            doctor: req.user.doctorId,
            $or: [{ "visits.image": imageUrl }, { "visits.images": imageUrl }],
        });
        if (!ownsAsset)
            return res.status(403).json({
                success: false,
                error: "Asset does not belong to you",
            });

        const isPDF = imageUrl.toLowerCase().endsWith(".pdf");

        const del = await cloudinary.uploader.destroy(publicId, {
            resource_type: isPDF ? "raw" : "image",
            invalidate: true,
        });

        await decrementUsage(req.user.doctorId, 1);

        return res.json({ success: true });
    } catch (err) {
        console.error("[delete-cloudinary]", err);
        return res.status(500).json({ success: false, error: "Delete failed" });
    }
});

module.exports = router;
