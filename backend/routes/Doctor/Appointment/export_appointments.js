const express = require("express");
const router = express.Router();
const Appointment = require("../../../models/Appointment");
const Doc = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const { decrypt } = require("../../../utils/crypto");
const {
    getPricing,
    invalidatePricingCache,
} = require("../../../utils/pricingcache");
const getDoctor = require("../../../utils/getDoctor");
const requireDoctor = require("../../../middleware/requireDoctor");
const requireSubscription = require("../../../middleware/requiresubscription");

router.get(
    "/check_export_limit",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        try {
            const { doctor, paymentMap } = await getDoctor(req, { lean: true });

            const pricing = await getPricing();

            const plan = (doctor.subscription?.plan || "free").toLowerCase();
            const limit = pricing[plan]?.excelLimit ?? 0;
            const used = doctor.usage?.excelExports || 0;

            if (limit !== -1 && used >= limit) {
                return res.status(403).json({
                    success: false,
                    error: "Excel export limit reached",
                });
            }

            return res.json({
                success: true,
                used,
                remaining: limit === -1 ? -1 : limit - used,
            });
        } catch (err) {
            return res.status(err.status || 500).json({
                success: false,
                error: err.message || "Server error",
            });
        }
    },
);

router.get(
    "/export_appointments",
    fetchuser,
    requireDoctor,
    async (req, res) => {
        try {
            const { doctor, doctorId, paymentMap } = await getDoctor(req, {
                lean: true,
            });

            const pricing = await getPricing();

            const plan = (doctor.subscription?.plan || "free").toLowerCase();
            const limit = pricing[plan]?.excelLimit ?? 0;

            // ATOMIC QUOTA CHECK + INCREMENT
            const updatedDoc = await Doc.findOneAndUpdate(
                {
                    _id: doctorId,
                    ...(limit !== -1 && {
                        "usage.excelExports": { $lt: limit },
                    }),
                },
                {
                    $inc: { "usage.excelExports": 1 },
                },
                {
                    new: true,
                },
            );

            // If limit exceeded or race lost
            if (!updatedDoc) {
                return res.status(403).json({
                    success: false,
                    error: "Excel export limit reached",
                });
            }

            const used = updatedDoc.usage?.excelExports || 0;

            // Fetch appointments AFTER quota secured
            const appointments = await Appointment.find({
                doctor: doctorId,
            }).populate("patient");

            const allVisits = [];

            appointments.forEach((appt) => {
                if (!appt.patient) return;

                appt.visits.forEach((visit) => {
                    const billed = Number(visit.amount ?? 0);
                    const collected = Number(visit.collected ?? billed);
                    const remaining = billed - collected;

                    let fullNumber = "";

                    // Case 1: encrypted
                    if (appt.patient.numberEncrypted) {
                        try {
                            fullNumber = decrypt(appt.patient.numberEncrypted);
                        } catch (err) {
                            console.error("Decrypt error:", err);
                        }
                    }

                    // Case 2: plain
                    if (!fullNumber && appt.patient.number) {
                        fullNumber = appt.patient.number;
                    }

                    // Case 3: masked fallback
                    if (!fullNumber && appt.patient.numberLast4) {
                        fullNumber = "******" + appt.patient.numberLast4;
                    }

                    const status =
                        remaining <= 0
                            ? "Paid"
                            : collected > 0
                              ? "Partial"
                              : "Unpaid";

                    const method =
                        paymentMap[visit.paymentMethodId?.toString()];

                    const paymentLabel =
                        method?.label ||
                        method?.subCategoryName ||
                        method?.categoryName ||
                        visit.payment_type ||
                        "Other";

                    allVisits.push({
                        patientId: appt.patient._id,
                        name: appt.patient.name,
                        number: fullNumber,
                        gender: appt.patient.gender || "",
                        date: visit.date,
                        paymentMethodId: visit.paymentMethodId,
                        payment_type: paymentLabel,
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
                exportsUsed: used,
                exportsRemaining: limit === -1 ? -1 : Math.max(limit - used, 0),
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                error: "Server error",
            });
        }
    },
);
module.exports = router;
