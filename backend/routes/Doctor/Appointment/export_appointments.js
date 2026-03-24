const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
const Doc = require("../../../models/Doc");
const Pricing = require("../../../models/Pricing");
const fetchuser = require("../../../middleware/fetchuser");
const { decrypt } = require("../../../utils/crypto");

router.get("/check_export_limit", fetchuser, async (req, res) => {
    try {
        const doctor = await Doc.findById(req.user.doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const pricing = await Pricing.findOne();
        if (!pricing) {
            return res.status(500).json({
                success: false,
                error: "Pricing config missing",
            });
        }

        const plan = doctor.subscription.plan.toLowerCase();
        const limit = pricing[plan].excelLimit;
        const used = doctor.usage.excelExports || 0;

        if (limit !== -1 && used >= limit) {
            return res.status(403).json({
                success: false,
                error: "Excel export limit reached",
            });
        }

        res.json({
            success: true,
            used,
            remaining: limit === -1 ? -1 : limit - used,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

router.get("/export_appointments", fetchuser, async (req, res) => {
    try {
        const doctor = await Doc.findById(req.user.doctorId);
        if (!doctor) {
            return res.status(404).json({
                success: false,
                error: "Doctor not found",
            });
        }

        const pricing = await Pricing.findOne();
        if (!pricing) {
            return res.status(500).json({
                success: false,
                error: "Pricing config missing",
            });
        }

        const plan = doctor.subscription.plan.toLowerCase();
        const limit = pricing[plan].excelLimit;
        const used = doctor.usage.excelExports || 0;

        if (limit !== -1 && used >= limit) {
            return res.status(403).json({
                success: false,
                error: "Excel export limit reached for your plan",
            });
        }

        // increment usage only AFTER confirmation (frontend)
        await Doc.findByIdAndUpdate(req.user.doctorId, {
            $inc: { "usage.excelExports": 1 },
        });

        const appointments = await Appointment.find({
            doctor: req.user.doctorId,
        }).populate("patient");

        const allVisits = [];

        appointments.forEach((appt) => {
            if (!appt.patient) return;

            appt.visits.forEach((visit) => {
                const billed = Number(visit.amount ?? 0);
                const collected = Number(visit.collected ?? billed);
                const remaining = billed - collected;
                let fullNumber = "";

                // ✅ Case 1: encrypted
                if (appt.patient.numberEncrypted) {
                    try {
                        fullNumber = decrypt(appt.patient.numberEncrypted);
                    } catch (err) {
                        console.error("Decrypt error:", err);
                    }
                }

                // ✅ Case 2: old plain number
                if (!fullNumber && appt.patient.number) {
                    fullNumber = appt.patient.number;
                }

                // ✅ Case 3: last fallback (at least show something)
                if (!fullNumber && appt.patient.numberLast4) {
                    fullNumber = "******" + appt.patient.numberLast4;
                }

                const status =
                    remaining <= 0
                        ? "Paid"
                        : collected > 0
                          ? "Partial"
                          : "Unpaid";

                allVisits.push({
                    patientId: appt.patient._id,
                    name: appt.patient.name,
                    number: fullNumber,
                    gender: appt.patient.gender || "",
                    date: visit.date,
                    payment_type: visit.payment_type || "Other",
                    amount: billed,
                    collected,
                    remaining,
                    status,
                    discount: visit.discount || 0,
                    isPercent: visit.isPercent || false,
                    services: visit.service || [],
                    invoiceNumber: visit.invoiceNumber || "",
                });
            });
        });

        allVisits.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            success: true,
            data: allVisits,
            exportsUsed: used + 1,
            exportsRemaining:
                limit === -1 ? -1 : Math.max(limit - (used + 1), 0),
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            error: "Server error",
        });
    }
});

module.exports = router;
