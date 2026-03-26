const express = require("express");
const router = express.Router();

const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const Counter = require("../../../models/Counter");
const Doc = require("../../../models/Doc");
const checkSubscription = require("../../../utils/subscription_check");
var fetchuser = require("../../../middleware/fetchuser");

router.post("/add_appointment/:id", fetchuser, async (req, res) => {
    try {
        const doctorId = req.user.doctorId; // ALWAYS TRUST THIS

        // GET DOCTOR
        const doctor = await Doc.findById(doctorId);

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found",
            });
        }

        await checkSubscription(doctor);

        if (doctor.subscription?.status === "expired") {
            return res.status(403).json({
                success: false,
                message: "Subscription expired. Upgrade required.",
            });
        }

        const {
            service,
            payment_type,
            date,
            discount,
            isPercent,
            collected,
            time,
            image,
        } = req.body;

        const patientId = req.params.id;

        //ALIDATION
        if (!Array.isArray(service) || service.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Service must be a non-empty array",
            });
        }

        // FIND PATIENT
        const patient = await Patient.findById(patientId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found",
            });
        }

        // ENSURE PATIENT BELONGS TO DOCTOR
        if (patient.doctor.toString() !== doctorId) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized access",
            });
        }

        const finalDoctorId = doctorId;

        // SERVICE TOTAL
        const serviceTotal = service.reduce(
            (sum, s) => sum + (Number(s.amount) || 0),
            0,
        );

        // DISCOUNT
        const rawDiscount = Number(discount) || 0;
        const percentFlag = Boolean(isPercent);

        let discountValue = percentFlag
            ? serviceTotal * (rawDiscount / 100)
            : rawDiscount;

        discountValue = Math.min(Math.max(discountValue, 0), serviceTotal);
        discountValue = Number(discountValue.toFixed(0));

        // FINAL AMOUNT
        const finalAmount = Number((serviceTotal - discountValue).toFixed(0));

        // PARTIAL PAYMENT
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

        // INVOICE COUNTER
        const counterId = `invoice_${finalDoctorId}`;

        const counter = await Counter.findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true },
        );

        const invoiceNumber = counter.seq;

        // IMAGE LIMIT CHECK
        const planLimits = {
            STARTER: 1800,
            PRO: 4200,
            ENTERPRISE: -1,
        };

        const limit = planLimits[doctor.subscription.plan];

        if (image && limit !== -1 && doctor.usage.imageUploads >= limit) {
            return res.status(403).json({
                success: false,
                message: "Image upload limit reached. Upgrade required.",
            });
        }
        // VISIT DATA
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
            discount: rawDiscount,
            isPercent: percentFlag,
            time: time || null,
            image: image || "",
        };

        // SAVE
        const appointment = await Appointment.findOneAndUpdate(
            { patient: patientId },
            {
                $push: { visits: visitData },
                $set: { doctor: finalDoctorId },
            },
            { new: true, upsert: true },
        );

        if (image) {
            doctor.usage.imageUploads = (doctor.usage.imageUploads || 0) + 1;

            await doctor.save();
        }
        // UPDATE PATIENT
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
