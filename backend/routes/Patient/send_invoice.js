const express = require("express");
const router = express.Router();
const puppeteer = require("puppeteer");
const Appointment = require("../../models/Appointment");
const fetchPatient = require("../../middleware/fetchpatient");
const { decrypt } = require("../../utils/crypto");
const {
    buildInvoiceHTML,
    currencySymbolMap,
    numberToWords,
    COUNTRY_LOCALE_MAP,
    getCurrencyLabel,
    numberToWordsInternational,
} = require("../../utils/invoiceTemplate");
const { transporter } = require("../../utils/mailer");
const { createLimiter } = require("../../middleware/ratelimiter");

// POST /api/patient/send-invoice
router.post(
    "/send-invoice",
    fetchPatient,
    createLimiter({ max: 10 }),
    async (req, res) => {
        try {
            const { visitId } = req.body;

            // FIX: was returning { error: "..." } without success field — inconsistent
            if (!visitId || typeof visitId !== "string") {
                return res
                    .status(400)
                    .json({ success: false, error: "visitId is required" });
            }

            // Ownership enforced: patient from JWT must own the appointment
            const appointment = await Appointment.findOne({
                patient: req.patient.id, // IDOR prevention
                "visits._id": visitId,
            })
                .populate("doctor")
                .populate("patient");

            if (!appointment) {
                return res
                    .status(404)
                    .json({ success: false, error: "Visit not found" });
            }

            const visit = appointment.visits.id(visitId);
            const doctor = appointment.doctor;
            const patient = appointment.patient;

            if (!patient?.email) {
                return res.status(400).json({
                    success: false,
                    error: "Patient email not on file",
                });
            }

            // Build a simple but clean invoice HTML
            const services = Array.isArray(visit.service) ? visit.service : [];
            const sym = doctor.subscription?.currency;

            const serviceRows = services
                .map(
                    (s) =>
                        `<tr><td>${s.name}</td><td>${sym}${Number(s.amount || 0).toFixed(0)}</td></tr>`,
                )
                .join("");

            const currencyCode = doctor.subscription?.currency || "";
            const currencySymbol = currencySymbolMap[currencyCode] || "";

            const currencyLabel = getCurrencyLabel(currencyCode);

            // format date
            const locale = doctor.address?.countryCode
                ? COUNTRY_LOCALE_MAP[doctor.address.countryCode]
                : "en-GB";

            const formattedDate = new Intl.DateTimeFormat(locale || "en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }).format(new Date(visit.date));

            const numberLocale = doctor.address?.countryCode
                ? COUNTRY_LOCALE_MAP[doctor.address.countryCode]
                : "en-IN";

            const formatMoney = (val) =>
                new Intl.NumberFormat(numberLocale, {
                    maximumFractionDigits: 0,
                }).format(val);

            const esc = (s) =>
                String(s || "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;");

            // normalize services
            // ALWAYS calculate from services (source of truth)
            const normalizedServices = (visit.service || []).map((s) => ({
                name: s.name,
                amount: Number(s.amount || 0),
            }));

            // subtotal from services
            const subtotal = normalizedServices.reduce(
                (sum, s) => sum + s.amount,
                0,
            );

            // discount logic
            let discountValue = 0;

            if (visit.discount) {
                if (visit.isPercent) {
                    discountValue = (subtotal * visit.discount) / 100;
                } else {
                    discountValue = visit.discount;
                }
            }

            // final total
            const finalAmount = Math.max(subtotal - discountValue, 0);

            // collected + remaining FIX
            const collectedAmount = Math.min(
                Number(visit.collected || 0),
                finalAmount,
            );

            const remainingAmount = Math.max(finalAmount - collectedAmount, 0);

            // status FIX
            const paymentStatus =
                remainingAmount === 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // words
            const amountInWords =
                numberToWordsInternational(Math.round(finalAmount)) +
                ` ${currencyLabel} only`;

            const formattedTime = visit.time || "";
            const invoiceNumber = visit.invoiceNumber || "—";
            let phone = "";

            if (doctor.phoneEncrypted) {
                try {
                    phone = decrypt(doctor.phoneEncrypted);
                } catch (err) {
                    console.error("Phone decrypt error:", err.message);
                    phone = "";
                }
            } else if (doctor.phoneLast4) {
                phone = `******${doctor.phoneLast4}`;
            }

            // ─── MAIN HTML ───
            const invoiceHtml = buildInvoiceHTML({
                currencySymbol,
                locale: numberLocale,

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
                    services: normalizedServices,
                    total: finalAmount,
                    discount: discountValue,
                    isPercent: visit.isPercent || false,
                    collected: collectedAmount,
                    balance: remainingAmount,
                    status: paymentStatus,
                    amountInWords,
                    date: formattedDate,
                },
            });

            // Generate PDF via puppeteer
            const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(20000);
            page.setDefaultTimeout(20000);
            let pdf;

            try {
                await page.setContent(invoiceHtml, {
                    waitUntil: "networkidle0",
                });

                pdf = await page.pdf({
                    format: "A4",
                    printBackground: true,
                });
            } finally {
                await browser.close();
            }

            // Send email with PDF attachment
            await transporter.sendMail({
                from: `"InvoHealth" <${process.env.MAIL_USER}>`,
                to: patient.email,
                subject: `Your Appointment Summary & Invoice - InvoHealth`,
                html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0; padding:0; background:#f0f4ff; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center">

  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">

    <!-- HEADER BAND -->
    <tr>
      <td style="background:linear-gradient(135deg,#3b6ff5 0%,#1e3a8a 100%); padding:36px 40px; text-align:center;">
        <img src="https://invohealth.vercel.app/logo.jpg" width="80" height="80"
             style="border-radius:50%; border:3px solid rgba(255,255,255,0.25); margin-bottom:16px; display:block; margin-left:auto; margin-right:auto;" />
        <div style="font-size:22px; font-weight:800; color:#ffffff; letter-spacing:-0.3px;">InvoHealth</div>
        <div style="font-size:13px; color:#bfcfff; margin-top:5px; font-weight:400;">Smart Medical Center Management</div>
      </td>
    </tr>

    <!-- GREETING -->
    <tr>
      <td style="padding:36px 40px 0;">
        <p style="font-size:17px; font-weight:700; color:#111827; margin:0 0 8px;">Hi ${esc(patient.name)},</p>
        <p style="font-size:14px; color:#6b7280; line-height:1.7; margin:0;">
          Thank you for visiting us. Your appointment has been successfully recorded. Here's a summary of your visit:
        </p>
      </td>
    </tr>

    <!-- APPOINTMENT CARD -->
    <tr>
      <td style="padding:24px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#f8faff; border:1px solid #e0e7ff; border-radius:12px; overflow:hidden;">
          <tr>
            <td style="padding:14px 20px; border-bottom:1px solid #e0e7ff;">
              <span style="font-size:13px; color:#6b7280;">👨‍⚕️ Doctor: </span>
              <span style="font-size:14px; font-weight:600; color:#111827;">Dr. ${esc(doctor?.name || "")}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px; border-bottom:1px solid #e0e7ff;">
              <span style="font-size:13px; color:#6b7280;">🏥 Center Name: </span>
              <span style="font-size:14px; font-weight:600; color:#111827;">${esc(doctor?.clinicName || "")}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px; border-bottom:1px solid #e0e7ff;">
              <span style="font-size:12px; color:#6b7280;">📞 Number: </span>
              <span style="font-size:14px; font-weight:600; color:#111827;">${esc(phone) || "—"}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px; border-bottom:1px solid #e0e7ff;">
              <span style="font-size:13px; color:#6b7280;">📅 Date: </span>
              <span style="font-size:14px; font-weight:600; color:#111827;">${formattedDate}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;">
              <span style="font-size:13px; color:#6b7280;">⏰ Time: </span>
              <span style="font-size:14px; font-weight:600; color:#111827;">${formattedTime || "—"}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- INVOICE BADGE -->
    <tr>
      <td style="padding:14px 50px;">
        <span style="font-size:13px; color:#6b7280;">Invoice Number: </span>
        <span style="font-size:14px; font-weight:600; color:#111827;">#INV-${invoiceNumber}</span>
      </td>
    </tr>

    <tr>
      <td style="padding:10px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px;">
          <tr>
            <td style="padding:14px 20px;">
              <span style="font-size:13px; color:#6b7280;">Invoice Total: </span>
              <span style="font-size:18px; font-weight:800; color:#1d4ed8;">${currencySymbol}${formatMoney(finalAmount)}</span>
              <span style="font-size:12px; color:#6b7280;"> (${amountInWords})</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- BODY TEXT -->
    <tr>
      <td style="padding:24px 40px 0;">
        <p style="font-size:14px; color:#374151; line-height:1.8; margin:0 0 12px;">
          Your invoice has been attached to this email as a <strong>PDF</strong>. Please keep it for your records.
        </p>
        <p style="font-size:14px; color:#374151; line-height:1.8; margin:0;">
          If you have any questions about your visit or invoice, don't hesitate to reach out — we're always happy to help.
        </p>
      </td>
    </tr>

    <!-- WELLNESS NOTE -->
    <tr>
      <td style="padding:20px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#f0fdf4; border-left:4px solid #22c55e; border-radius:0 8px 8px 0;">
          <tr>
            <td style="padding:14px 18px; font-size:14px; color:#166534; font-weight:500;">
              💙 Wishing you good health and a smooth recovery.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:20px 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0"
               style="background:#f8faff; border:1px solid #e0e7ff; border-radius:10px;">
          <tr>
            <td style="padding:16px 20px; text-align:center;">
              <p style="font-size:14px; color:#374151; margin:0 0 12px;">
                Want to manage your health records and appointments easily?
              </p>
              <a href="https://invohealth.vercel.app"
                 style="display:inline-block; background:#3b6ff5; color:#ffffff;
                        padding:10px 18px; border-radius:6px; font-size:13px;
                        font-weight:600; text-decoration:none;">
                Explore InvoHealth
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- SIGN-OFF -->
    <tr>
      <td style="padding:28px 40px 36px;">
        <p style="font-size:14px; color:#374151; margin:0; line-height:1.8;">
          Best regards!<br>
          <strong style="color:#111827;">InvoHealth Team</strong><br>
          <a href="mailto:${process.env.MAIL_USER}"
             style="color:#3b6ff5; text-decoration:none; font-size:13px;">${process.env.MAIL_USER}</a>
        </p>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background:#f9fafb; border-top:1px solid #e5e7eb; padding:16px 20px; text-align:center;">
        <p style="font-size:12px; color:#6b7280; margin:0 0 6px;">
          ⚠️ This is an automated email from InvoHealth. Please do not reply to this message.
        </p>
        <p style="font-size:12px; color:#9ca3af; margin:0 0 6px; line-height:1.5;">
          This communication may contain confidential and sensitive medical information intended only for the recipient.
          Unauthorized use, disclosure, or distribution is not permitted.
        </p>
        <p style="font-size:12px; color:#9ca3af; margin:0;">© 2026 InvoHealth · All rights reserved</p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>
            `,
                attachments: [
                    {
                        filename: `Invoice-INV-${visit.invoiceNumber}.pdf`,
                        content: pdf,
                        contentType: "application/pdf",
                    },
                ],
            });

            return res.json({ success: true });
        } catch (err) {
            console.error("SEND INVOICE ERROR:", err);
            return res
                .status(500)
                .json({ success: false, error: "Server error" });
        }
    },
);

module.exports = router;
