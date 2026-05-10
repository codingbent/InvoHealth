// routes/Doctor/Appointment/add_appointment.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const Slot = require("../../../models/Slot");
const Counter = require("../../../models/Counter");
const Doc = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const { getPricing } = require("../../../utils/pricingcache");
const upload = require("../../../middleware/upload");
const uploadToCloudinary = require("../../../utils/uploadToCloudinary");
const requireSubscription = require("../../../middleware/requiresubscription");
const { decrypt } = require("../../../utils/crypto");
const { transporter } = require("../../../utils/mailer");
const {
    buildAppointmentEmail,
    currencySymbolMap,
    numberToWords,
    numberToWordsInternational,
    getCurrencyLabel,
    getLocaleFromCountry,
    isIndianCurrency,
} = require("../../../utils/invoiceTemplate");

const MAX_IMAGE_MB = 2;
const MAX_PDF_MB = 2;

router.post(
    "/add_appointment",
    fetchuser,
    requireSubscription,
    upload.array("images", 10),
    async (req, res) => {
        const doctorId = req.user?.doctorId;

        let uploadedFiles = [];

        const session = await mongoose.startSession();

        try {
            // ── PARSE + VALIDATE ─────────────────────────────
            const {
                patientId,
                date = null,
                time = null,
                paymentMethodId = null,
                categoryName = null,
                amount = 0,
                collected = 0,
                remaining = 0,
                status = "Unpaid",
                discount = 0,
                isPercent = false,
            } = req.body;

            const services = JSON.parse(req.body.services || "[]");

            if (!patientId) {
                return res.status(400).json({
                    success: false,
                    message: "patientId is required",
                });
            }

            const normalizedServices = services
                .map((s) => ({
                    id: s.id || null,
                    name: String(s.name || "").trim(),
                    amount: Number(s.amount) || 0,
                }))
                .filter(
                    (s) => s.name && Number.isFinite(s.amount) && s.amount >= 0,
                );

            if (!normalizedServices.length) {
                return res.status(400).json({
                    success: false,
                    error: "At least one valid service is required",
                });
            }
            // ── SAFE BILLING CALCULATION (DO NOT TRUST FRONTEND) ──
            const totalAmount = normalizedServices.reduce(
                (sum, s) => sum + Number(s.amount || 0),
                0,
            );

            const isPercentDiscount =
                isPercent === true || isPercent === "true";

            let discountValue = Number(discount) || 0;

            if (isPercentDiscount) {
                discountValue = (totalAmount * discountValue) / 100;
            }

            discountValue = Math.min(discountValue, totalAmount);

            const finalAmount = Math.max(totalAmount - discountValue, 0);

            const collectedAmount = Math.min(
                Math.max(Number(collected) || 0, 0),
                finalAmount,
            );

            const remainingAmount = Math.max(finalAmount - collectedAmount, 0);

            const paymentStatus =
                remainingAmount === 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // ── FILE VALIDATION ──────────────────────────────
            const files = req.files || [];

            for (const file of files) {
                const isPDF = file.mimetype === "application/pdf";

                const allowed = isPDF
                    ? ["application/pdf"]
                    : ["image/jpeg", "image/png", "image/webp", "image/gif"];

                if (!allowed.includes(file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid file type",
                    });
                }
            }

            // ── FETCH REQUIRED DATA ─────────────────────────
            const [docData, patient] = await Promise.all([
                Doc.findById(doctorId).session(session),
                Patient.findById(patientId).lean(),
            ]);

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient not found",
                });
            }

            if (
                !patient.doctors?.some(
                    (d) => d.toString() === doctorId.toString(),
                )
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Patient not in your Center",
                });
            }

            if (!docData) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor not found",
                });
            }

            // ── UPLOAD FILES FIRST ──────────────────────────
            if (files.length > 0) {
                const results = await Promise.all(
                    files.map((f) => uploadToCloudinary(f.buffer, f.mimetype)),
                );

                uploadedFiles = results.map((r, i) => ({
                    url: r.secure_url,
                    public_id: r.public_id,
                    type: files[i].mimetype,
                    resource_type:
                        files[i].mimetype === "application/pdf"
                            ? "raw"
                            : "image",
                }));
            }

            let appointment = null;

            // ── START TRANSACTION ───────────────────────────
            await session.withTransaction(async () => {
                // SLOT CLAIM
                let slotDoc = null;

                if (time && date) {
                    slotDoc = await Slot.create(
                        [
                            {
                                doctor: doctorId,
                                date,
                                time,
                            },
                        ],
                        { session },
                    );
                }

                // IMAGE USAGE UPDATE
                if (uploadedFiles.length > 0) {
                    // AFTER — fetch limit from pricing, guard with $lt
                    const pricing = await getPricing();
                    const plan =
                        docData.subscription?.plan?.toLowerCase() || "starter";
                    const imageLimit = pricing?.[plan]?.imageLimit ?? 0;

                    const updated = await Doc.findOneAndUpdate(
                        {
                            _id: doctorId,
                            ...(imageLimit !== -1 && {
                                "usage.imageUploads": {
                                    $lte: imageLimit - uploadedFiles.length, // ensure enough headroom
                                },
                            }),
                        },
                        {
                            $inc: {
                                "usage.imageUploads": uploadedFiles.length,
                            },
                        },
                        { new: true, session },
                    );

                    if (!updated) {
                        // Over limit — throw so transaction aborts and Cloudinary cleanup runs
                        const limitErr = new Error("IMAGE_LIMIT_REACHED");
                        limitErr.code = "IMAGE_LIMIT_REACHED";
                        throw limitErr;
                    }
                }

                // INVOICE COUNTER
                const counter = await Counter.findByIdAndUpdate(
                    `invoice_${doctorId}`,
                    {
                        $inc: { seq: 1 },
                    },
                    {
                        new: true,
                        upsert: true,
                        session,
                    },
                );

                const invoiceNumber = counter.seq;

                // APPOINTMENT SAVE
                const visit = {
                    service: normalizedServices,
                    amount: totalAmount,
                    collected: collectedAmount,
                    remaining: remainingAmount,
                    status: paymentStatus,
                    invoiceNumber,
                    date: date,
                    time: time || null,
                    paymentMethodId: paymentMethodId || null,
                    categoryName: categoryName || null,
                    discount: Number(discount) || 0,
                    isPercent: isPercentDiscount,
                    images: uploadedFiles,
                };

                appointment = await Appointment.findOneAndUpdate(
                    {
                        patient: patientId,
                        doctor: doctorId,
                    },
                    {
                        $push: {
                            visits: visit,
                        },
                    },
                    {
                        new: true,
                        upsert: true,
                        session,
                    },
                );

                // SLOT BACKFILL
                if (slotDoc?.[0]) {
                    const savedVisit =
                        appointment.visits[appointment.visits.length - 1];

                    await Slot.updateOne(
                        {
                            _id: slotDoc[0]._id,
                        },
                        {
                            $set: {
                                visitId: savedVisit._id,
                            },
                        },
                        {
                            session,
                        },
                    );
                }

                return appointment;
            });

            const createdVisit =
                appointment.visits[appointment.visits.length - 1];

            // ── SEND APPOINTMENT EMAIL (fire and forget) ─────────────────
            if (patient.email) {
                const currencyCode = docData.subscription?.currency || "";
                const currencySymbol = currencySymbolMap[currencyCode] || "";

                const locale = docData.address?.countryCode
                    ? `en-${docData.address.countryCode}`
                    : "en-IN";

                const formattedDate = createdVisit.date
                    ? new Intl.DateTimeFormat("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                      }).format(new Date(createdVisit.date))
                    : "—";

                const formattedTime = createdVisit.time || "—";

                transporter
                    .sendMail({
                        to: patient.email,
                        subject: "Appointment Confirmed - InvoHealth",
                        html: buildAppointmentEmail({
                            patient,
                            doctor: docData,
                            formattedDate,
                            formattedTime,
                        }),
                    })
                    .catch((err) =>
                        console.error(
                            "[APPOINTMENT EMAIL ERROR]:",
                            err.message,
                        ),
                    );
            }

            return res.status(201).json({
                success: true,
                message: "Appointment added successfully",

                appointment: {
                    _id: appointment._id,
                    patient: appointment.patient,

                    visits: [
                        {
                            _id: createdVisit._id,
                            invoiceNumber: createdVisit.invoiceNumber,
                            date: createdVisit.date,
                            time: createdVisit.time,

                            amount: createdVisit.amount,
                            collected: createdVisit.collected,
                            remaining: createdVisit.remaining,
                            status: createdVisit.status,

                            service: createdVisit.service || [],
                        },
                    ],
                },
            });
        } catch (err) {
            // Cloudinary cleanup runs for all errors including limit reached
            if (uploadedFiles.length > 0) {
                await Promise.allSettled(
                    uploadedFiles.map((f) =>
                        cloudinary.uploader.destroy(f.public_id, {
                            resource_type: f.resource_type,
                        }),
                    ),
                );
            }

            if (err.code === "IMAGE_LIMIT_REACHED") {
                return res.status(403).json({
                    success: false,
                    message:
                        "Image upload limit reached for your plan. Upgrade to upload more.",
                });
            }

            return res
                .status(500)
                .json({ success: false, message: "Server error" });
        } finally {
            session.endSession();
        }
    },
);

module.exports = router;
