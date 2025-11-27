const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const fetchuser = require("../middleware/fetchuser");
const ExcelJS = require("exceljs");

// GET: Excel download
router.get("/download-excel", fetchuser, async (req, res) => {
    try {
        const appointments = await Appointment.find({ doctor: req.doc.id })
            .populate("patient", "name number")
            .populate("doctor", "name");

        // Build visit list
        const visits = appointments.flatMap((a) =>
            (a.visits || []).map((v) => ({
                patientName: a.patient?.name || "Unknown",
                number: a.patient?.number || "N/A",
                doctorName: a.doctor?.name || "Unknown",
                date: v.date ? new Date(v.date).toLocaleDateString() : "",
                paymentType: v.payment_type || "",
                invoiceNumber: v.invoiceNumber || "",
                amount: v.amount || 0,
                services: (v.service || [])
                    .map((s) => s?.name || "")
                    .join(", "),
            }))
        );

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Visit Records");

        sheet.columns = [
            { header: "Patient", key: "patientName", width: 20 },
            { header: "Number", key: "number", width: 15 },
            { header: "Doctor", key: "doctorName", width: 20 },
            { header: "Date", key: "date", width: 15 },
            { header: "Payment", key: "paymentType", width: 12 },
            { header: "Invoice", key: "invoiceNumber", width: 10 },
            { header: "Amount", key: "amount", width: 10 },
            { header: "Services", key: "services", width: 35 },
        ];

        visits.forEach((v) => sheet.addRow(v));

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
