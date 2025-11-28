const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const fetchuser = require("../middleware/fetchuser");
const ExcelJS = require("exceljs");

// GET: Excel download
router.get("/download-excel", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({
            doctor: req.doc.id,
        })
            .populate("patient", "name number")
            .populate("doctor", "name");

        const grouped = {};

        appointments.forEach((a) => {
            // 🛑 FIX #1 — Skip appointments with no visits
            // Skip appointments with no visits
            if (!a.visits || a.visits.length === 0) return;

            // Skip missing or invalid patients
            if (!a.patient || !a.patient.name) return;

            // For each visit
            a.visits.forEach((v) => {
                if (!v.date) return;

                const iso = new Date(v.date).toISOString().split("T")[0];

                if (!grouped[iso]) grouped[iso] = [];

                grouped[iso].push({
                    patientName: a.patient?.name || "Unknown",
                    number: a.patient?.number || "N/A",
                    doctorName: a.doctor?.name || "Unknown",
                    date: new Date(v.date).toLocaleDateString(),
                    paymentType: v.payment_type || "",
                    invoiceNumber: v.invoiceNumber || "",
                    amount: v.amount || 0,
                    services: (v.service || [])
                        .map((s) => s?.name || "")
                        .join(", "),
                });
            });
        });

        // Sort dates in ascending order
        const sortedDates = Object.keys(grouped).sort(
            (a, b) => new Date(a) - new Date(b)
        );

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Visit Records");

        sortedDates.forEach((dateStr) => {
            // Date header
            sheet.addRow([`${new Date(dateStr).toLocaleDateString()}`]);
            sheet.lastRow.font = { bold: true };

            // Column header
            sheet.addRow([
                "Patient",
                "Number",
                "Doctor",
                "Date",
                "Payment",
                "Invoice",
                "Amount",
                "Services",
            ]);
            sheet.lastRow.font = { bold: true };

            // Add visits
            grouped[dateStr].forEach((v) => {
                sheet.addRow([
                    v.patientName,
                    v.number,
                    v.doctorName,
                    v.date,
                    v.paymentType,
                    v.invoiceNumber,
                    v.amount,
                    v.services,
                ]);
            });

            // Blank space after each date group
            sheet.addRow([]);
        });

        // Excel headers
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            "attachment; filename=visit-records.xlsx"
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Excel Error:", error);
        res.status(500).json({
            message: "Server error generating Excel",
            error: error.message,
        });
    }
});

module.exports = router;
