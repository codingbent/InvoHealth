const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
var fetchuser = require("../../../middleware/fetchuser");
const mongoose = require("mongoose");
const requireSubscription = require("../../../middleware/requiresubscription");

router.put(
    "/edit_appointment/:appointmentId/:visitId",
    fetchuser,
    requireSubscription,
    async (req, res) => {
        try {
            const { appointmentId, visitId } = req.params;
            const {
                date,
                time,
                service,
                payment_type,
                paymentMethodId,
                discount,
                isPercent,
                collected,
                image,
            } = req.body;

            // Validation
            if (!date || !Array.isArray(service) || service.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Date and at least one service are required",
                });
            }

            if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
                return res
                    .status(400)
                    .json({ message: "Invalid appointment ID" });
            }

            //  TIME VALIDATION
            if (time && !/^\d{2}:\d{2}$/.test(time)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid time format",
                });
            }
            // Find appointment
            const appointment = await Appointment.findOne({
                _id: appointmentId,
                doctor: req.user.doctorId,
            });

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: "Appointment not found or unauthorized",
                });
            }
            // Find visit
            const visit = appointment.visits.id(visitId);
            if (!visit) {
                return res.status(404).json({
                    success: false,
                    message: "Visit not found",
                });
            }

            let conflict = null;

            if (time) {
                const selectedDateStr = new Date(date).toDateString();

                conflict = appointment.visits.find(
                    (v) =>
                        v._id.toString() !== visitId &&
                        v.time &&
                        v.time === time &&
                        new Date(v.date).toDateString() === selectedDateStr,
                );
            }

            if (conflict) {
                return res.status(400).json({
                    success: false,
                    message: "This time slot is already booked",
                });
            }

            if (time) {
                const [hours, minutes] = time.split(":").map(Number);
                const fullDate = new Date(date);
                fullDate.setHours(hours, minutes, 0, 0);

                visit.date = fullDate;
                visit.time = time;
            } else {
                visit.date = new Date(date);
            }

            // Normalize services
            visit.service = service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: Number(s.amount) || 0,
            }));

            // Compute service total
            const serviceTotal = visit.service.reduce(
                (sum, s) => sum + s.amount,
                0,
            );

            // Discount calculation
            const disc = Number(discount) || 0;
            const percentFlag = Boolean(isPercent);

            let discountValue = 0;
            if (disc > 0) {
                discountValue = percentFlag
                    ? serviceTotal * (disc / 100)
                    : disc;
            }

            if (discountValue > serviceTotal) discountValue = serviceTotal;
            if (discountValue < 0) discountValue = 0;

            // Final amount
            const finalAmount = serviceTotal - discountValue;

            // Recalculate payment logic (USE FRONTEND VALUE)
            let collectedAmount;

            if (collected !== undefined) {
                collectedAmount = Number(collected);
            } else {
                collectedAmount = visit.collected || 0;
            }

            if (collectedAmount < 0) collectedAmount = 0;
            if (collectedAmount > finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Collected amount exceeds final amount.",
                });
            }

            const remainingAmount = finalAmount - collectedAmount;

            const status =
                remainingAmount === 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // Update visit fields
            visit.amount = finalAmount;
            visit.discount = disc;
            visit.isPercent = percentFlag;
            visit.collected = collectedAmount;
            visit.remaining = remainingAmount;
            visit.status = status;

            // ===== PAYMENT HANDLING =====

            // New system
            if (paymentMethodId) {
                visit.paymentMethodId = paymentMethodId;
                visit.payment_type = undefined; // clean old
            }

            // Old system fallback
            else if (
                payment_type &&
                ["Cash", "Card", "SBI", "ICICI", "HDFC", "Other"].includes(
                    payment_type,
                )
            ) {
                visit.payment_type = payment_type;
            }

            if (image !== undefined && image !== null) {
                visit.image = image;
            }
            // Save
            await appointment.save();

            return res.json({
                success: true,
                message: "Invoice updated successfully",
                visit,
            });
        } catch (err) {
            console.error("Edit invoice error:", err);
            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    },
);

module.exports = router;
