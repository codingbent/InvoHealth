const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const fetchuser = require("../middleware/fetchuser");
const ExcelJS = require("exceljs");

router.get("/download-excel", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctor: req.doc.id })
            .populate("patient", "name number")
            .populate("doctor", "name");

        const grouped = {};

        // Group visits by date
        appointments.forEach((a) => {
            // Skip appointments with no visits
            if (!a.visits || a.visits.length === 0) return;

            // Skip missing or invalid patients
            if (
                !a.patient ||
                Object.keys(a.patient).length === 0 ||
                !a.patient.name
            ) {
                return;
            }

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

        // Sort dates ascending
        const sortedDates = Object.keys(grouped).sort(
            (a, b) => new Date(a) - new Date(b)
        );

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Visit Records");

        // Write grouped rows
        sortedDates.forEach((dateStr) => {
            // Date title
            sheet.addRow([`${new Date(dateStr).toLocaleDateString()}`]);
            sheet.lastRow.font = { bold: true };

            // Column headers
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

            // 🔥 Sort by invoiceNumber ascending
            const sortedVisits = grouped[dateStr].sort(
                (a, b) => Number(a.invoiceNumber) - Number(b.invoiceNumber)
            );

            let dayTotal = 0;

            // Visits
            sortedVisits.forEach((v) => {
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

                dayTotal += v.amount;
            });

            // 🔥 GRAND TOTAL ROW
            const totalRow = sheet.addRow([
                "",
                "",
                "",
                "",
                "",
                "TOTAL",
                dayTotal,
                "",
            ]);
            totalRow.font = { bold: true };

            // Blank line between groups
            sheet.addRow([]);
        });

        // Response headers
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
