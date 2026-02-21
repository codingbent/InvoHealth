const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
var fetchuser = require("../../../middleware/fetchuser");

router.put(
    "/edit_appointment/:appointmentId/:visitId",
    fetchuser,
    async (req, res) => {
        try {
            const { appointmentId, visitId } = req.params;
            const {
                date,
                service,
                payment_type,
                discount,
                isPercent,
                collected,
            } = req.body;

            // 1️⃣ Validation
            if (!date || !Array.isArray(service) || service.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Date and at least one service are required",
                });
            }

            // 2️⃣ Find appointment
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: "Appointment not found",
                });
            }

            // 3️⃣ Find visit
            const visit = appointment.visits.id(visitId);
            if (!visit) {
                return res.status(404).json({
                    success: false,
                    message: "Visit not found",
                });
            }

            // 4️⃣ Update date
            visit.date = new Date(date);

            // 5️⃣ Normalize services
            visit.service = service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: Number(s.amount) || 0,
            }));

            // 6️⃣ Compute service total
            const serviceTotal = visit.service.reduce(
                (sum, s) => sum + s.amount,
                0,
            );

            // 7️⃣ Discount calculation
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

            // 8️⃣ Final amount
            const finalAmount = serviceTotal - discountValue;

            // 9️⃣ Recalculate payment logic (USE FRONTEND VALUE)
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

            // 🔟 Update visit fields
            visit.amount = finalAmount;
            visit.discount = disc;
            visit.isPercent = percentFlag;
            visit.collected = collectedAmount;
            visit.remaining = remainingAmount;
            visit.status = status;

            if (
                payment_type &&
                ["Cash", "Card", "SBI", "ICICI", "HDFC", "Other"].includes(
                    payment_type,
                )
            ) {
                visit.payment_type = payment_type;
            }

            // 1️⃣1️⃣ Save
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
