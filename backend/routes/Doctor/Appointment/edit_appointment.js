const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Appointment = require("../../../models/Appointment");
const Slot = require("../../../models/Slot");
const fetchuser = require("../../../middleware/fetchuser");
const requireSubscription = require("../../../middleware/requiresubscription");

// ── Image validation ──────────────────────────────────────────────────────────
const CLOUDINARY_BASE =
    process.env.CLOUDINARY_BASE_URL || "https://res.cloudinary.com/";

const VALID_RESOURCE_TYPES = new Set(["image", "raw"]);

function validateImageObject(img, index) {
    if (!img || typeof img !== "object" || Array.isArray(img)) {
        throw new Error(`images[${index}]: must be an object`);
    }
    if (typeof img.url !== "string" || !img.url.startsWith(CLOUDINARY_BASE)) {
        throw new Error(
            `images[${index}].url: must be a Cloudinary URL starting with ${CLOUDINARY_BASE}`,
        );
    }
    if (typeof img.public_id !== "string" || !img.public_id.trim()) {
        throw new Error(
            `images[${index}].public_id: must be a non-empty string`,
        );
    }
    if (!VALID_RESOURCE_TYPES.has(img.resource_type)) {
        throw new Error(
            `images[${index}].resource_type: must be "image" or "raw"`,
        );
    }
    return {
        url: img.url.trim(),
        public_id: img.public_id.trim(),
        resource_type: img.resource_type,
        ...(typeof img.type === "string" && img.type.trim()
            ? { type: img.type.trim() }
            : {}),
    };
}

router.put(
    "/edit_appointment/:appointmentId/:visitId",
    fetchuser,
    requireSubscription,
    async (req, res) => {
        const session = await mongoose.startSession();

        try {
            const { appointmentId, visitId } = req.params;

            const doctorId =
                req.user.role === "doctor" ? req.user.id : req.user.doctorId;

            const {
                date,
                time,
                service,
                paymentMethodId,
                discount,
                isPercent,
                collected,
                images,
            } = req.body;

            if (date !== undefined && date !== null) {
                if (
                    typeof date !== "string" ||
                    !/^\d{4}-\d{2}-\d{2}$/.test(date)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid date format. Expected YYYY-MM-DD",
                    });
                }
            }

            // ── Validate images before touching the DB ────────────────────────
            let validatedImages;
            if (images !== undefined) {
                if (!Array.isArray(images)) {
                    return res.status(400).json({
                        success: false,
                        message: "images must be an array",
                    });
                }
                try {
                    validatedImages = images.map((img, i) =>
                        validateImageObject(img, i),
                    );
                } catch (err) {
                    return res.status(400).json({
                        success: false,
                        message: err.message,
                    });
                }
            }

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

            const visit = appointment.visits.id(visitId);

            if (!visit) {
                return res.status(404).json({
                    success: false,
                    message: "Visit not found",
                });
            }

            // Capture old slot values before any mutation so the transaction
            // body can release them correctly.
            const oldSlotDate = visit.date;
            const oldSlotTime = visit.time;

            const slotIsChanging =
                (date !== undefined && date !== visit.date) ||
                (time !== undefined && time !== visit.time);

            const newSlotDate = date !== undefined ? date : visit.date;
            const newSlotTime = time !== undefined ? time : visit.time;

            // ── SERVICE VALIDATION (outside transaction — pure computation) ────
            let normalizedServices = visit.service;

            if (service !== undefined) {
                if (!Array.isArray(service) || service.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: "Service must be a non-empty array",
                    });
                }

                try {
                    normalizedServices = service.map((s, index) => {
                        if (!s || typeof s !== "object") {
                            throw new Error(
                                `Invalid service at index ${index}`,
                            );
                        }
                        const name =
                            typeof s.name === "string" ? s.name.trim() : "";
                        if (!name) {
                            throw new Error(
                                `Service name required at index ${index}`,
                            );
                        }
                        if (/[<>]/.test(name)) {
                            throw new Error(
                                `Invalid characters in service name`,
                            );
                        }
                        const amount = Number(s.amount);
                        if (!Number.isFinite(amount)) {
                            throw new Error(`Invalid amount at index ${index}`);
                        }
                        if (amount < 0) {
                            throw new Error(`Negative amount not allowed`);
                        }
                        if (amount > 1_000_000) {
                            throw new Error(`Amount too large`);
                        }
                        return { id: s.id || undefined, name, amount };
                    });
                } catch (err) {
                    return res.status(400).json({
                        success: false,
                        message: err.message,
                    });
                }
            }

            // ── TOTAL & BILLING CALCULATION (pure, outside transaction) ────────
            const total = (normalizedServices || []).reduce(
                (sum, s) => sum + (s.amount || 0),
                0,
            );

            let safeDiscount = Number(discount ?? visit.discount ?? 0);
            const safeIsPercent =
                isPercent !== undefined ? isPercent : visit.isPercent;

            if (!Number.isFinite(safeDiscount) || safeDiscount < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid discount value",
                });
            }
            if (safeIsPercent && safeDiscount > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Percentage discount cannot exceed 100%",
                });
            }
            if (!safeIsPercent) {
                safeDiscount = Math.min(safeDiscount, total);
            }

            let discountValue = 0;
            if (safeDiscount > 0) {
                discountValue = safeIsPercent
                    ? total * (safeDiscount / 100)
                    : safeDiscount;
            }

            const finalAmount = Math.max(total - discountValue, 0);

            let finalCollected = Number(collected);
            if (!Number.isFinite(finalCollected) || finalCollected < 0) {
                finalCollected = 0;
            }
            if (finalCollected > finalAmount) finalCollected = finalAmount;

            const finalRemaining = Math.max(finalAmount - finalCollected, 0);
            const finalStatus =
                finalRemaining === 0
                    ? "Paid"
                    : finalCollected > 0
                      ? "Partial"
                      : "Unpaid";

            await session.withTransaction(async () => {
                if (slotIsChanging && newSlotTime) {
                    try {
                        await Slot.swap(
                            doctorId,
                            { date: oldSlotDate, time: oldSlotTime },
                            { date: newSlotDate, time: newSlotTime },
                            session,
                        );
                    } catch (swapErr) {
                        if (swapErr.code === 11000) {
                            const slotConflict = new Error("SLOT_CONFLICT");
                            slotConflict.code = "SLOT_CONFLICT";
                            throw slotConflict;
                        }
                        throw swapErr;
                    }
                }

                // 2. Apply all field mutations to the visit subdocument.
                if (date !== undefined) visit.date = date;
                if (time !== undefined) visit.time = time;
                if (paymentMethodId !== undefined)
                    visit.paymentMethodId = paymentMethodId;
                if (validatedImages !== undefined)
                    visit.images = validatedImages;
                if (service !== undefined) visit.service = normalizedServices;

                visit.discount = safeDiscount;
                visit.isPercent = safeIsPercent;
                visit.amount = total;
                visit.collected = finalCollected;
                visit.remaining = finalRemaining;
                visit.status = finalStatus;

                await appointment.save({ session });
            });

            return res.json({
                success: true,
                message: "Appointment updated",
                visit,
            });
        } catch (err) {
            // SLOT_CONFLICT is a clean 409 — not a 500.
            if (err.code === "SLOT_CONFLICT" || err.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: "That time slot is already booked",
                });
            }

            console.error("❌ EDIT ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Server error",
            });
        } finally {
            session.endSession();
        }
    },
);

module.exports = router;
