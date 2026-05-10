const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Doc = require("../../../models/Doc");
const Appointment = require("../../../models/Appointment");
const Country = require("../../../models/Country");
const { PaymentSubCategory } = require("../../../models/PaymentMethod");
const fetchuser = require("../../../middleware/fetchuser");
const requireSubscription = require("../../../middleware/requiresubscription");
const requireDoctor = require("../../../middleware/requireDoctor");
const { createLimiter } = require("../../../middleware/ratelimiter");
const generateAppointmentExcel = require("../../../utils/generateAppointmentExcel");
const getDoctor = require("../../../utils/getDoctor");
const { getPricing } = require("../../../utils/pricingcache");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const appointmentExportTemplate = ({
    doctorName,
    totalVisits,
    filtersApplied,
}) => {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8" />
        <title>Appointment Export</title>
    </head>

    <body style="
        margin:0;
        padding:0;
        background:#f8fafc;
        font-family:Arial,sans-serif;
    ">

        <div style="
            max-width:600px;
            margin:40px auto;
            background:white;
            border-radius:12px;
            overflow:hidden;
            border:1px solid #e2e8f0;
        ">

            <div style="
                background:#0f172a;
                padding:24px;
                text-align:center;
            ">
                <h1 style="
                    color:white;
                    margin:0;
                    font-size:24px;
                ">
                    InvoHealth
                </h1>
            </div>

            <div style="
                padding:32px;
                color:#1e293b;
            ">

                <h2 style="margin-top:0;">
                    Appointment Export Ready
                </h2>

                <p>
                    Hello Dr. ${esc(doctorName)},
                </p>

                <p>
                    Your appointment export has been generated successfully.
                    ${filtersApplied ? "<br/><strong>Note: This export reflects your active filters.</strong>" : ""}
                </p>

                <div style="
                    background:#f1f5f9;
                    padding:16px;
                    border-radius:10px;
                    margin:20px 0;
                ">
                    <p style="margin:0;">
                        <strong>Total Visits:</strong>
                        ${totalVisits}
                    </p>
                </div>

                <p>
                    The Excel report is attached to this email.
                </p>

                <p>
                    Regards,<br />
                    InvoHealth
                </p>

            </div>

            <div style="
                background:#f8fafc;
                padding:18px;
                text-align:center;
                color:#64748b;
                font-size:12px;
            ">
                © ${new Date().getFullYear()} InvoHealth
            </div>

        </div>

    </body>
    </html>
    `;
};

router.get(
    "/check_export_limit",
    fetchuser,
    requireDoctor,
    requireSubscription,
    async (req, res) => {
        try {
            const { doctor } = await getDoctor(req, { lean: true });

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

router.post(
    "/email_export",
    fetchuser,
    requireDoctor,
    requireSubscription,
    createLimiter({ max: 10 }),

    async (req, res) => {
        try {
            const { doctor, doctorId } = await getDoctor(req, { lean: true });

            const pricing = await getPricing();

            const plan = (doctor.subscription?.plan || "free").toLowerCase();

            const limit = pricing[plan]?.excelLimit ?? 0;

            const updatedDoc = await Doc.findOneAndUpdate(
                {
                    _id: doctorId,

                    ...(limit !== -1 && {
                        "usage.excelExports": {
                            $lt: limit,
                        },
                    }),
                },

                {
                    $inc: {
                        "usage.excelExports": 1,
                    },
                },

                { new: true },
            );

            if (!updatedDoc) {
                return res.status(403).json({
                    success: false,
                    error: "Excel export limit reached",
                });
            }

            const countryDoc = await Country.findById(
                doctor.address?.countryId,
            ).lean();

            const locale = countryDoc?.code === "IN" ? "en-IN" : "en-US";
            const currencySymbol = countryDoc?.symbol || "₹";

            // ── Payment label maps ───────────────────────────────────────────
            const doctorWithPayments = await Doc.findById(doctorId)
                .populate("paymentMethods.categoryId")
                .populate("paymentMethods.subCategoryId")
                .lean();

            // Map: subCategoryId string → doctor's label or subCategory/category name
            const paymentLabelMap = {};
            for (const pm of doctorWithPayments?.paymentMethods || []) {
                if (!pm.subCategoryId) continue;
                const key = String(pm.subCategoryId._id || pm.subCategoryId);
                paymentLabelMap[key] =
                    pm.label ||
                    pm.subCategoryId?.name ||
                    pm.categoryId?.name ||
                    null;
            }

            // Safety-net: every PaymentSubCategory in DB
            const allSubCategories = await PaymentSubCategory.find({}).lean();
            const subCategoryNameMap = {};
            for (const sc of allSubCategories) {
                subCategoryNameMap[String(sc._id)] = sc.name;
            }

            // ── Parse filters sent by PatientList.jsx ────────────────────────
            // Frontend sends: { search, gender, payments[], status[], services[], startDate, endDate }
            const {
                search = "",
                gender = "",
                payments = [], // subCategoryId strings — matches visit.paymentMethodId
                status = [], // "Paid" | "Partial" | "Unpaid"
                services = [], // service name strings
                startDate = "",
                endDate = "",
            } = req.body?.filters || {};

            const filtersApplied =
                !!search ||
                !!gender ||
                payments.length > 0 ||
                status.length > 0 ||
                services.length > 0 ||
                !!startDate ||
                !!endDate;

            // ── Date range ───────────────────────────────────────────────────
            let start = null;
            let end = null;

            if (startDate) {
                start = new Date(startDate);
                if (!isNaN(start)) start.setHours(0, 0, 0, 0);
                else start = null;
            }

            if (endDate) {
                end = new Date(endDate);
                if (!isNaN(end)) end.setHours(23, 59, 59, 999);
                else end = null;
            }

            // ── Normalise filter sets ────────────────────────────────────────
            const paymentIdSet = new Set(
                (Array.isArray(payments) ? payments : [])
                    .map((id) => String(id).trim())
                    .filter((id) => mongoose.Types.ObjectId.isValid(id)),
            );

            const statusSet = new Set(
                (Array.isArray(status) ? status : [])
                    .map((s) => s.trim())
                    .filter(Boolean),
            );

            const servicesSet = new Set(
                (Array.isArray(services) ? services : [])
                    .map((s) => s.trim())
                    .filter(Boolean),
            );

            const searchLower = search?.trim().toLowerCase() || "";

            // ── Fetch all appointments for this doctor ───────────────────────
            const appointments = await Appointment.find({
                doctor: doctorId,
            }).populate("patient");

            const allVisits = [];

            appointments.forEach((appt) => {
                if (!appt.patient) return;

                // ── Patient-level filters ────────────────────────────────────
                if (
                    gender &&
                    appt.patient.gender?.toLowerCase() !== gender.toLowerCase()
                ) {
                    return;
                }

                if (searchLower) {
                    const nameMatch = appt.patient.name
                        ?.toLowerCase()
                        .includes(searchLower);
                    const numMatch = appt.patient.number?.includes(
                        search.trim(),
                    );
                    if (!nameMatch && !numMatch) return;
                }

                appt.visits.forEach((visit) => {
                    // ── Visit-level filters ──────────────────────────────────

                    // Date range
                    if (start && new Date(visit.date) < start) return;
                    if (end && new Date(visit.date) > end) return;

                    // Payment method (visit.paymentMethodId IS a subCategoryId)
                    const pmId = visit.paymentMethodId
                        ? String(visit.paymentMethodId)
                        : "";

                    if (paymentIdSet.size > 0 && !paymentIdSet.has(pmId))
                        return;

                    // Services — at least one service must match
                    if (servicesSet.size > 0) {
                        const visitServiceNames = (visit.service || []).map(
                            (s) => (typeof s === "object" ? s.name : s),
                        );
                        if (!visitServiceNames.some((n) => servicesSet.has(n)))
                            return;
                    }

                    // ── Financials ───────────────────────────────────────────
                    const billed = Number(visit.amount ?? 0);
                    const collected = Number(visit.collected ?? billed);
                    const remaining = billed - collected;

                    const computedStatus =
                        remaining <= 0
                            ? "Paid"
                            : collected > 0
                              ? "Partial"
                              : "Unpaid";

                    // Status filter — applied after computing status from live values
                    if (statusSet.size > 0 && !statusSet.has(computedStatus))
                        return;

                    // ── Payment label ────────────────────────────────────────
                    const paymentLabel =
                        (pmId && paymentLabelMap[pmId]) ||
                        (pmId && subCategoryNameMap[pmId]) ||
                        "Other";

                    allVisits.push({
                        name: appt.patient.name,
                        age: appt.patient.age || "",
                        gender: appt.patient.gender || "",
                        date: visit.date,
                        payment_type: paymentLabel.split(" ")[0] || "Other",
                        amount: billed,
                        collected,
                        remaining,
                        status: computedStatus,
                        discount: visit.discount || 0,
                        isPercent: visit.isPercent || false,
                        services: visit.service || [],
                        invoiceNumber: visit.invoiceNumber || "",
                    });
                });
            });

            // Roll back quota if nothing matched — don't charge for an empty export
            if (!allVisits.length) {
                await Doc.findByIdAndUpdate(doctorId, {
                    $inc: { "usage.excelExports": -1 },
                });

                return res.status(400).json({
                    success: false,
                    error: filtersApplied
                        ? "No visits match the selected filters"
                        : "No visit data found",
                });
            }

            const buffer = await generateAppointmentExcel({
                data: allVisits,
                doctorName: doctor.name || doctor.clinicName || "Doctor",
                currencySymbol,
                locale,
            });

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.MAIL_USER,
                    pass: process.env.MAIL_PASS,
                },
            });

            await transporter.sendMail({
                from: process.env.MAIL_USER,
                to: doctor.email,
                subject: `Appointment Export${filtersApplied ? " (Filtered)" : ""} - InvoHealth`,
                html: appointmentExportTemplate({
                    doctorName: doctor.name || "Doctor",
                    totalVisits: allVisits.length,
                    filtersApplied,
                }),
                attachments: [
                    {
                        filename: "invohealth-records.xlsx",
                        content: buffer,
                    },
                ],
            });

            return res.json({
                success: true,
                message: "Excel report sent successfully",
            });
        } catch (err) {
            console.error(err);

            return res.status(500).json({
                success: false,
                error: "Failed to send export",
            });
        }
    },
);

module.exports = router;
