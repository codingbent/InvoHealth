const express = require("express");
const router = express.Router();
const Appointment = require("../../models/Appointment");
const fetchPatient = require("../../middleware/fetchpatient");
const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const {
  buildInvoiceHTML,
  currencySymbolMap,
  getCurrencyLabel,
  numberToWords,
  numberToWordsInternational,
} = require("../../utils/invoiceTemplate");
const { createLimiter } = require("../../middleware/ratelimiter");

router.get(
  "/download-invoice/:visitId",
  fetchPatient,
  createLimiter({ max: 5 }),
  async (req, res) => {
    try {
      const { visitId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(visitId)) {
        return res.status(400).json({ error: "Invalid visit ID" });
      }

      const appointment = await Appointment.findOne({
        patient: req.patient.id,
        "visits._id": visitId,
      })
        .populate("doctor")
        .populate("patient");

      if (!appointment) {
        return res.status(404).json({ error: "Visit not found" });
      }

      const visit = appointment.visits.id(visitId);
      const doctor = appointment.doctor;
      const patient = appointment.patient;

      const currencyCode = doctor.subscription?.currency || "INR";
      const currencySymbol = currencySymbolMap[currencyCode] || "₹";

      // normalize services
      const services = (visit.service || []).map((s) => ({
        name: s.name,
        amount: Number(s.amount || 0),
      }));

      // subtotal (SOURCE OF TRUTH)
      const subtotal = services.reduce((sum, s) => sum + s.amount, 0);

      // discount
      let discountValue = 0;
      if (visit.discount) {
        if (visit.isPercent) {
          discountValue = (subtotal * visit.discount) / 100;
        } else {
          discountValue = visit.discount;
        }
      }

      // clamp
      discountValue = Math.max(0, Math.min(discountValue, subtotal));

      // final total
      const finalAmount = Math.max(subtotal - discountValue, 0);

      // collected + remaining
      const collectedAmount = Math.min(
        Number(visit.collected || 0),
        finalAmount,
      );

      const remainingAmount = Math.max(finalAmount - collectedAmount, 0);

      // status
      const paymentStatus =
        remainingAmount === 0
          ? "Paid"
          : collectedAmount > 0
            ? "Partial"
            : "Unpaid";

      // date format (country safe)
      const locale = doctor.address?.countryCode ? "en-GB" : "en-IN";

      const formattedDate = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(visit.date));

      // words
      const words =
        currencyCode === "INR"
          ? numberToWords(Math.round(finalAmount))
          : numberToWordsInternational(Math.round(finalAmount));

      const amountInWords = `${getCurrencyLabel(currencyCode)} ${words} Only`;
      const invoicePayload = {
        currencySymbol,

        clinic: {
          name: doctor.clinicName || "",
          address: doctor.address || {},
          phone: doctor.phone || "",
        },

        doctor: {
          name: doctor.name || "",
          qualification: doctor.degree?.join(", ") || "",
          regNo: doctor.regNumber || "",
          email: doctor.email || "",
        },

        patient: {
          name: patient.name || "",
          age: patient.age || "",
          gender: patient.gender || "",
        },

        appointment: {
          date: formattedDate,
          time: visit.time || "",
        },

        invoice: {
          invoiceNumber: visit.invoiceNumber,
          services: services,

          // FIXED VALUES
          total: finalAmount,
          discount: discountValue,
          isPercent: visit.isPercent || false,
          collected: collectedAmount,
          balance: remainingAmount,
          status: paymentStatus,

          amountInWords,
          date: formattedDate,
        },
      };

      const html = buildInvoiceHTML(invoicePayload);

      let browserInstance = null;
      async function getBrowser() {
        if (!browserInstance || !browserInstance.isConnected()) {
          browserInstance = await puppeteer.launch({
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          });
        }
        return browserInstance;
      }
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(20000);
      page.setDefaultTimeout(20000);
      let pdf;
      try {
        await page.setContent(html, { waitUntil: "networkidle0" });
        pdf = await page.pdf({ format: "A4" });
      } finally {
        await browser.close();
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice_${visit.invoiceNumber}.pdf`,
      );
      res.send(pdf);
    } catch (err) {
      console.error("DOWNLOAD INVOICE ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  },
);

module.exports = router;
