const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const fetchuser = require("../middleware/fetchuser");
const ExcelJS = require("exceljs");
const Doc = require("../models/Doc");

// GET: Excel download
router.get("/download-excel", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctor: req.doc.id })
            .populate("patient", "name number")
            .populate("doctor", "name");

        const grouped = {};

        // Group visits by date
        appointments.forEach((a) => {
            (a.visits || []).forEach((v) => {
                if (!v.date) return;

                const iso = new Date(v.date).toISOString().split("T")[0]; // YYYY-MM-DD

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

        // ✅ SORT DATES ASCENDING (OLDEST FIRST)
        const sortedDates = Object.keys(grouped).sort(
            (a, b) => new Date(a) - new Date(b)
        );

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Visit Records");

        // Write grouped rows
        sortedDates.forEach((dateStr) => {
            // Date header (bold)
            sheet.addRow([`${new Date(dateStr).toLocaleDateString()}`]);
            sheet.lastRow.font = { bold: true };

            // Column header for each date section
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

            // Add visits under this date
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

            // Blank line between groups
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
