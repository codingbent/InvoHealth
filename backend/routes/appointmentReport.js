// routes/appointmentReport.js
const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const Appointment = require("../models/Appointment");
const fetchuser = require("../middleware/fetchuser");

// existing fetch-all-visits route (keep as is)
// router.get("/fetch-all-visits", fetchuser, async (req, res) => { ... });

router.get("/download-excel", fetchuser, async (req, res) => {
    try {
        // fetch all appointments of this doctor
        const appointments = await Appointment.find({ doctor: req.doc.id })
            .populate("patient", "name number")
            .populate("doctor", "name");

        // flatten visits
        const allVisits = appointments.flatMap((a) =>
            (a.visits || []).map((v) => ({
                patientName: a.patient?.name || "Unknown",
                number: a.patient?.number || "N/A",
                doctorName: a.doctor?.name || "Unknown",
                date: v.date,
                paymentType: v.payment_type,
                invoiceNumber: v.invoiceNumber,
                amount: v.amount,
            }))
        );

        // create workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Visit Records");

        // define columns
        sheet.columns = [
            { header: "Patient Name", key: "patientName", width: 30 },
            { header: "Number", key: "number", width: 18 },
            { header: "Doctor", key: "doctorName", width: 25 },
            { header: "Date", key: "date", width: 18 },
            { header: "Payment Type", key: "paymentType", width: 15 },
            { header: "Invoice Number", key: "invoiceNumber", width: 15 },
            { header: "Amount", key: "amount", width: 12 },
        ];

        // Optionally style header
        sheet.getRow(1).font = { bold: true };

        // Add rows. Format date to readable string.
        for (const v of allVisits) {
            sheet.addRow({
                patientName: v.patientName,
                number: v.number,
                doctorName: v.doctorName,
                date: v.date ? new Date(v.date).toLocaleString() : "",
                paymentType: v.paymentType,
                invoiceNumber: v.invoiceNumber,
                amount: v.amount,
            });
        }

        // Set response headers to trigger download
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        const filename = `visit-records-${new Date()
            .toISOString()
            .slice(0, 10)}.xlsx`;
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=${filename}`
        );

        // stream workbook to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Excel Download Error:", err);
        res.status(500).json({ message: "Server error generating Excel" });
    }
});

module.exports = router;
