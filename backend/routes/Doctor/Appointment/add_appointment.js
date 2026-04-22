const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const Counter = require("../../../models/Counter");
const Doc = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const { getPricing } = require("../../../utils/pricingcache");
const { getSubscriptionStatus } = require("../../../utils/subscription_check");
const upload = require("../../../middleware/upload");
const uploadToCloudinary = require("../../../utils/uploadToCloudinary");
const requireSubscription = require("../../../middleware/requiresubscription");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 2;

router.post(
    "/add_appointment",
    fetchuser,
    requireSubscription,
    upload.single("image"),
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;

            // ── PARSE BODY (multipart fields come as strings) ──
            const patientId = req.body.patientId;
            const service = JSON.parse(req.body.services || "[]");
            const payment_type = req.body.payment_type || null;
            const date = req.body.date || null;
            const discount = Number(req.body.discount) || 0;
            const isPercent = req.body.isPercent === "true";
            const collected = Math.max(Number(req.body.collected) || 0, 0);
            const time = req.body.time || null;
            const paymentMethodId = req.body.paymentMethodId || null;
            const categoryName = req.body.categoryName || null;

            if (!patientId) {
                return res.status(400).json({
                    success: false,
                    message: "patientId is required",
                });
            }

            // ── VALIDATE FILE (if provided) ──
            if (req.file) {
                if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid file type. Only JPEG, PNG, WEBP, GIF allowed.",
                    });
                }

                const fileSizeMB = req.file.size / (1024 * 1024);
                if (fileSizeMB > MAX_FILE_SIZE_MB) {
                    return res.status(400).json({
                        success: false,
                        message: `File too large. Max ${MAX_FILE_SIZE_MB}MB allowed.`,
                    });
                }
            }
            const doctor = req.doctor;
            const [pricing, patient] = await Promise.all([
                getPricing(),
                Patient.findById(patientId),
            ]);

            if (!doctor) {
                return res
                    .status(404)
                    .json({ success: false, message: "Doctor not found" });
            }

            if (!pricing) {
                return res.status(500).json({
                    success: false,
                    message: "Pricing config missing",
                });
            }

            if (!patient) {
                return res
                    .status(404)
                    .json({ success: false, message: "Patient not found" });
            }

            if (patient.doctor.toString() !== doctorId) {
                return res
                    .status(403)
                    .json({ success: false, message: "Unauthorized access" });
            }

            const plan = doctor.subscription?.plan?.toLowerCase() || "free";
            const planData = pricing[plan] || {};

            // ── VALIDATE SERVICES ──
            if (!Array.isArray(service) || service.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Service must be a non-empty array",
                });
            }

            for (const s of service) {
                if (!s || typeof s !== "object") {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid service object",
                    });
                }
                if (!s.name || typeof s.name !== "string" || !s.name.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: "Each service must have a valid name",
                    });
                }
                if (
                    s.amount === undefined ||
                    s.amount === null ||
                    isNaN(Number(s.amount))
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Each service must have a valid amount",
                    });
                }
                if (Number(s.amount) < 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Service amount cannot be negative",
                    });
                }
            }

            const normalizedServices = service.map((s) => ({
                id: s.id || null,
                name: s.name.trim(),
                amount: Number(s.amount),
            }));

            // ── BILLING CALCULATIONS ──
            const serviceTotal = normalizedServices.reduce(
                (sum, s) => sum + (Number(s.amount) || 0),
                0,
            );

            const percentFlag = Boolean(isPercent);
            let discountValue = percentFlag
                ? serviceTotal * (discount / 100)
                : discount;

            discountValue = Math.min(Math.max(discountValue, 0), serviceTotal);
            discountValue = Number(discountValue.toFixed(0));

            const finalAmount = Number(
                (serviceTotal - discountValue).toFixed(0),
            );
            let collectedAmount = Math.max(Number(collected) || 0, 0);

            if (collectedAmount > finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Collected amount cannot exceed final amount",
                });
            }

            const remainingAmount = finalAmount - collectedAmount;
            const paymentStatus =
                remainingAmount === 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // ── IMAGE LIMIT CHECK (before touching counter or Cloudinary) ──
            const imageLimit = planData?.imageLimit ?? 0;
            if (
                req.file &&
                imageLimit !== -1 &&
                doctor.usage?.imageUploads >= imageLimit
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Image upload limit reached. Upgrade required.",
                });
            }

            // ── ATOMIC IMAGE UPLOAD (race-condition safe) ──
            let imageUrl = "";
            if (req.file) {
                // Atomically claim the slot BEFORE uploading to Cloudinary
                const updatedDoc = await Doc.findOneAndUpdate(
                    {
                        _id: doctorId,
                        ...(imageLimit !== -1 && {
                            "usage.imageUploads": { $lt: imageLimit },
                        }),
                    },
                    { $inc: { "usage.imageUploads": 1 } },
                    { new: true },
                );

                if (!updatedDoc) {
                    return res.status(403).json({
                        success: false,
                        message:
                            "Image upload limit reached. Upgrade required.",
                    });
                }

                // Only upload to Cloudinary after the slot is claimed
                try {
                    const result = await uploadToCloudinary(req.file.buffer);
                    imageUrl = result.secure_url;
                } catch (cloudinaryErr) {
                    // Roll back the usage increment if Cloudinary fails
                    await Doc.updateOne(
                        { _id: doctorId },
                        { $inc: { "usage.imageUploads": -1 } },
                    );
                    console.error("Cloudinary upload failed:", cloudinaryErr);
                    return res.status(502).json({
                        success: false,
                        message: "Image upload failed. Appointment not saved.",
                    });
                }
            }

            // ── INVOICE COUNTER ──
            const counter = await Counter.findByIdAndUpdate(
                `invoice_${doctorId}`,
                { $inc: { seq: 1 } },
                { new: true, upsert: true },
            );

            const invoiceNumber = counter.seq;
            const visitDate = date ? new Date(date) : new Date();

            const visitData = {
                service: normalizedServices,
                amount: finalAmount,
                collected: collectedAmount,
                remaining: remainingAmount,
                status: paymentStatus,
                paymentMethodId: paymentMethodId || null,
                categoryName: categoryName || null,
                invoiceNumber,
                date: visitDate,
                discount,
                isPercent: percentFlag,
                time: time || null,
                image: imageUrl,
            };

            // ── SAVE APPOINTMENT ──
            const appointment = await Appointment.findOneAndUpdate(
                { patient: patientId, doctor: doctorId },
                { $push: { visits: visitData } },
                { new: true, upsert: true },
            );

            // ── UPDATE PATIENT lastAppointment ──
            const currentLast = patient.lastAppointment
                ? new Date(patient.lastAppointment)
                : null;

            if (!currentLast || visitDate > currentLast) {
                patient.lastAppointment = visitDate;
                patient.lastpayment_type = payment_type;
                await patient.save();
            }

            return res.status(201).json({
                success: true,
                message: "Appointment added successfully",
                appointment,
            });
        } catch (err) {
            console.error("Add Appointment Error:", err);
            // FIX: err.message is no longer sent to the client.
            // It can contain internal details like DB field names, query structure,
            // or Mongoose validation messages that reveal implementation internals.
            // The full error is still logged server-side for debugging.
            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    },
);

module.exports = router;
