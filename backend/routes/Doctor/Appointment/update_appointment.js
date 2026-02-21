const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
const authMiddleware = require("../../../middleware/fetchuser");

router.put(
    "/update_appointment/:appointmentId/:visitId",
    authMiddleware,
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

            if (!date || !Array.isArray(service) || service.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid data. Missing date or services.",
                });
            }

            const appointment = await Appointment.findById(appointmentId);
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

            // ✅ Update date
            visit.date = new Date(date);

            // ✅ Normalize services
            visit.service = service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: Number(s.amount) || 0,
            }));

            // ✅ Service total
            const serviceTotal = visit.service.reduce(
                (sum, s) => sum + s.amount,
                0,
            );

            // ✅ Discount
            const disc = Number(discount) || 0;
            const percentFlag = Boolean(isPercent);

            let discountValue = percentFlag
                ? serviceTotal * (disc / 100)
                : disc;

            if (discountValue < 0) discountValue = 0;
            if (discountValue > serviceTotal) discountValue = serviceTotal;

            const finalAmount = serviceTotal - discountValue;

            // ✅ Partial payment logic
            let collectedAmount = Number(collected) || 0;

            if (collectedAmount < 0) collectedAmount = 0;
            if (collectedAmount > finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Collected amount cannot exceed final amount",
                });
            }

            const remainingAmount = finalAmount - collectedAmount;

            const status =
                remainingAmount === 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

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

            await appointment.save();

            return res.json({
                success: true,
                message: "Appointment updated successfully",
                visit,
            });
        } catch (err) {
            console.error("Error updating appointment:", err);
            return res.status(500).json({
                success: false,
                message: err.message || "Server error",
            });
        }
    },
);

module.exports = router;
