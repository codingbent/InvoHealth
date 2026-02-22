const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const Counter = require("../../../models/Counter");
const { body, validationResult } = require("express-validator");

router.post("/add_appointment/:id", async (req, res) => {
    try {
        const {
            service,
            payment_type,
            doctorId,
            date,
            discount,
            isPercent,
            collected,
        } = req.body;

        const patientId = req.params.id;

        // 1️⃣ VALIDATION
        if (!Array.isArray(service) || service.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Service must be a non-empty array",
            });
        }

        // 2️⃣ FIND PATIENT
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }

        // 3️⃣ DETERMINE DOCTOR
        const finalDoctorId = doctorId || patient.doctor;
        if (!finalDoctorId) {
            return res.status(400).json({
                success: false,
                message: "Doctor ID missing",
            });
        }

        // 4️⃣ SERVICE TOTAL
        const serviceTotal = service.reduce(
            (sum, s) => sum + (Number(s.amount) || 0),
            0,
        );

        // 5️⃣ DISCOUNT
        const rawDiscount = Number(discount) || 0;
        const percentFlag = Boolean(isPercent);

        let discountValue = percentFlag
            ? serviceTotal * (rawDiscount / 100)
            : rawDiscount;

        discountValue = Math.min(Math.max(discountValue, 0), serviceTotal);
        discountValue = Number(discountValue.toFixed(0));

        // 6️⃣ FINAL AMOUNT
        const finalAmount = Number((serviceTotal - discountValue).toFixed(0));

        // 7️⃣ PARTIAL PAYMENT
        let collectedAmount = Math.max(Number(collected) || 0, 0);

        if (collectedAmount > finalAmount) {
            return res.status(400).json({
                success: false,
                message: "Collected amount cannot exceed final amount",
            });
        }

        const remainingAmount = Number(
            (finalAmount - collectedAmount).toFixed(0),
        );

        const status =
            remainingAmount === 0
                ? "Paid"
                : collectedAmount > 0
                  ? "Partial"
                  : "Unpaid";

        // 8️⃣ INVOICE COUNTER
        const counterId = `invoice_${finalDoctorId}`;

        const counter = await Counter.findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true },
        );

        const invoiceNumber = counter.seq;

        // 9️⃣ CREATE VISIT OBJECT
        const visitDate = date ? new Date(date) : new Date();

        const visitData = {
            service: service.map((s) => ({
                id: s.id || null,
                name: s.name,
                amount: Number(s.amount) || 0,
            })),
            amount: finalAmount,
            collected: collectedAmount,
            remaining: remainingAmount,
            status,
            payment_type,
            invoiceNumber,
            date: visitDate,
            discount: rawDiscount, // store original input
            isPercent: percentFlag,
        };

        // 🔟 SAVE
        const appointment = await Appointment.findOneAndUpdate(
            { patient: patientId },
            {
                $push: { visits: visitData },
                $set: { doctor: finalDoctorId },
            },
            { new: true, upsert: true },
        );

        // 1️⃣1️⃣ UPDATE PATIENT
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
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
});

module.exports = router;
