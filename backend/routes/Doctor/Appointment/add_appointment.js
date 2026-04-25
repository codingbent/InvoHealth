const express = require("express");
const router = express.Router();
const Patient = require("../../../models/Patient");
const Appointment = require("../../../models/Appointment");
const Counter = require("../../../models/Counter");
const Doc = require("../../../models/Doc");
const fetchuser = require("../../../middleware/fetchuser");
const { getPricing } = require("../../../utils/pricingcache");
const upload = require("../../../middleware/upload");
const uploadToCloudinary = require("../../../utils/uploadToCloudinary");
const requireSubscription = require("../../../middleware/requiresubscription");
const puppeteer = require("puppeteer");
const { decrypt } = require("../../../utils/crypto");

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_MB = 2;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const currencySymbolMap = {
    INR: "₹",
    USD: "$",
    GBP: "£",
    EUR: "€",
    AED: "د.إ",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    JPY: "¥",
    CNY: "¥",
    KRW: "₩",
    SAR: "﷼",
    QAR: "﷼",
    KWD: "د.ك",
    BHD: ".د.ب",
    CHF: "Fr",
    SEK: "kr",
    NOK: "kr",
    DKK: "kr",
    ZAR: "R",
    BRL: "R$",
    MXN: "$",
    MYR: "RM",
    PHP: "₱",
    THB: "฿",
    ILS: "₪",
    HKD: "HK$",
    NZD: "NZ$",
};

function getCurrencyLabel(currencyCode) {
    const map = {
        INR: "Rupees",
        USD: "Dollars",
        GBP: "Pounds",
        EUR: "Euros",
        AED: "Dirhams",
        AUD: "Dollars",
        CAD: "Dollars",
        SGD: "Dollars",
        JPY: "Yen",
        CNY: "Yuan",
        KRW: "Won",
        SAR: "Riyals",
        QAR: "Riyals",
        KWD: "Dinars",
        BHD: "Dinars",
        CHF: "Francs",
        SEK: "Krona",
        NOK: "Krone",
        DKK: "Krone",
        ZAR: "Rand",
        BRL: "Reais",
        MXN: "Pesos",
        MYR: "Ringgit",
        PHP: "Pesos",
        THB: "Baht",
        ILS: "Shekels",
        HKD: "Dollars",
        NZD: "Dollars",
    };
    return map[currencyCode] || currencyCode;
}

function getLocaleFromCountry(countryCode) {
    const map = {
        IN: "en-IN",
        US: "en-US",
        GB: "en-GB",
        AU: "en-AU",
        CA: "en-CA",
        AE: "en-AE",
        EU: "en-GB",
        SG: "en-SG",
        JP: "ja-JP",
        CN: "zh-CN",
        KR: "ko-KR",
    };
    return map[countryCode] || "en-US";
}

function isIndianCurrency(currency) {
    return currency === "INR";
}

function numberToWords(num) {
    const belowTwenty = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ];
    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ];
    function convert(n) {
        if (n < 20) return belowTwenty[n];
        if (n < 100)
            return (
                tens[Math.floor(n / 10)] +
                (n % 10 ? " " + belowTwenty[n % 10] : "")
            );
        if (n < 1000)
            return (
                belowTwenty[Math.floor(n / 100)] +
                " Hundred" +
                (n % 100 ? " " + convert(n % 100) : "")
            );
        if (n < 100000)
            return (
                convert(Math.floor(n / 1000)) +
                " Thousand" +
                (n % 1000 ? " " + convert(n % 1000) : "")
            );
        if (n < 10000000)
            return (
                convert(Math.floor(n / 100000)) +
                " Lakh" +
                (n % 100000 ? " " + convert(n % 100000) : "")
            );
        return (
            convert(Math.floor(n / 10000000)) +
            " Crore" +
            (n % 10000000 ? " " + convert(n % 10000000) : "")
        );
    }
    return convert(num);
}

function numberToWordsInternational(num) {
    const belowTwenty = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ];
    const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety",
    ];
    function convert(n) {
        if (n < 20) return belowTwenty[n];
        if (n < 100)
            return (
                tens[Math.floor(n / 10)] +
                (n % 10 ? " " + belowTwenty[n % 10] : "")
            );
        if (n < 1000)
            return (
                belowTwenty[Math.floor(n / 100)] +
                " Hundred" +
                (n % 100 ? " " + convert(n % 100) : "")
            );
        if (n < 1000000)
            return (
                convert(Math.floor(n / 1000)) +
                " Thousand" +
                (n % 1000 ? " " + convert(n % 1000) : "")
            );
        if (n < 1000000000)
            return (
                convert(Math.floor(n / 1000000)) +
                " Million" +
                (n % 1000000 ? " " + convert(n % 1000000) : "")
            );
        return (
            convert(Math.floor(n / 1000000000)) +
            " Billion" +
            (n % 1000000000 ? " " + convert(n % 1000000000) : "")
        );
    }
    return convert(num);
}

function buildInvoiceHTML(data) {
    const currency = data.currencySymbol || "";

    const servicesRows = data.invoice.services
        .map(
            (s) => `
        <tr>
            <td style="padding:12px 16px; font-size:14px; color:#374151; border-bottom:1px solid #e5e7eb;">
                ${s.name}
            </td>
            <td style="padding:12px 16px; font-size:14px; color:#374151; text-align:right; border-bottom:1px solid #e5e7eb;">
                ${currency} ${Number(s.amount || 0).toLocaleString()}
            </td>
        </tr>
        `,
        )
        .join("");

    const balanceRow =
        data.invoice.balance > 0
            ? `
        <tr>
            <td style="padding:12px 16px; font-size:14px; font-weight:600; color:#111827; background:#f9fafb; border-bottom:1px solid #e5e7eb;">
                Balance Due
            </td>
            <td style="padding:12px 16px; font-size:14px; font-weight:600; color:#ef4444; text-align:right; background:#f9fafb; border-bottom:1px solid #e5e7eb;">
                ${currency} ${(data.invoice.balance || 0).toLocaleString()}
            </td>
        </tr>
    `
            : "";

    const statusColor =
        data.invoice.status === "Paid"
            ? "#16a34a"
            : data.invoice.status === "Partial"
              ? "#d97706"
              : "#ef4444";

    const receiptLine =
        data.invoice.status === "Paid"
            ? `Received with thanks from <strong>${data.patient.name}</strong> the sum of <strong>${currency} ${(data.invoice.total || 0).toLocaleString()}</strong> only.`
            : `Payment partially received. Remaining balance pending.`;

    // Compact address — skip blank lines
    const addrParts = [
        data.clinic.address?.line1,
        data.clinic.address?.line2,
        data.clinic.address?.line3,
        [data.clinic.address?.city, data.clinic.address?.state]
            .filter(Boolean)
            .join(", "),
        data.clinic.address?.pincode,
    ].filter(Boolean);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #f3f4f6;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #111827;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    width: 794px;           /* A4 at 96 dpi */
    min-height: 1123px;
    margin: 0 auto;
    background: #ffffff;
    padding: 48px 52px;
    display: flex;
    flex-direction: column;
  }

  /* ── HEADER ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 24px;
    border-bottom: 2px solid #111827;
  }

  .clinic-name {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.3px;
    margin-bottom: 8px;
  }

  .doctor-info {
    font-size: 12.5px;
    color: #4b5563;
    line-height: 1.7;
  }

  .doctor-info strong {
    font-weight: 700;
    color: #111827;
    font-size: 13.5px;
  }

  .clinic-meta {
    text-align: right;
    font-size: 12.5px;
    color: #4b5563;
    line-height: 1.7;
  }

  /* ── INVOICE META ── */
  .invoice-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 22px;
    margin-bottom: 6px;
  }

  .invoice-number {
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.2px;
    text-transform: uppercase;
  }

  .invoice-date {
    font-size: 13px;
    color: #6b7280;
  }

  .patient-line {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 22px;
    padding-bottom: 18px;
    border-bottom: 1px solid #e5e7eb;
  }

  /* ── TABLE ── */
  table.invoice-table {
    width: 100%;
    border-collapse: collapse;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }

  .invoice-table thead tr {
    background: #111827;
    color: #ffffff;
  }

  .invoice-table thead th {
    padding: 13px 16px;
    font-size: 13px;
    font-weight: 600;
    text-align: left;
    letter-spacing: 0.4px;
    text-transform: uppercase;
  }

  .invoice-table thead th:last-child {
    text-align: right;
  }

  .invoice-table tbody tr.summary-row td {
    background: #111827;
    color: #ffffff;
    font-weight: 700;
    font-size: 14px;
    padding: 13px 16px;
    border-bottom: none;
  }

  .invoice-table tbody tr.summary-row td:last-child {
    text-align: right;
  }

  .invoice-table tbody tr.detail-row td {
    background: #f9fafb;
    font-weight: 600;
    font-size: 13.5px;
    color: #111827;
    padding: 12px 16px;
    border-bottom: 1px solid #e5e7eb;
  }

  .invoice-table tbody tr.detail-row td:last-child {
    text-align: right;
  }

  .invoice-table tbody tr.status-row td {
    background: #f9fafb;
    font-weight: 700;
    font-size: 13.5px;
    padding: 12px 16px;
    border-bottom: none;
  }

  .invoice-table tbody tr.status-row td:last-child {
    text-align: right;
    color: ${statusColor};
  }

  /* ── FOOTER ── */
  .footer {
    margin-top: 28px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    font-size: 12.5px;
    color: #6b7280;
    line-height: 1.7;
  }

  .footer .in-words {
    display: flex;
    gap: 8px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
  }

  .footer .in-words span { font-weight: 400; color: #6b7280; }

  .footer .receipt {
    font-style: italic;
    color: #6b7280;
    margin-top: 4px;
  }

  /* ── SIGNATURE ── */
  .signature {
    margin-top: auto;
    padding-top: 48px;
    text-align: right;
  }

  .sign-line {
    border-top: 1px solid #9ca3af;
    width: 200px;
    margin-left: auto;
    margin-bottom: 8px;
  }

  .sign-name {
    font-size: 13.5px;
    font-weight: 700;
    color: #111827;
  }

  .sign-title {
    font-size: 11.5px;
    color: #9ca3af;
    margin-top: 2px;
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="clinic-name">${data.clinic.name}</div>
      <div class="doctor-info">
        <strong>${data.doctor.name}</strong><br>
        ${data.doctor.qualification}<br>
        Reg No: ${data.doctor.regNo}<br>
        ${data.doctor.email ? data.doctor.email + "<br>" : ""}
      </div>
    </div>
    <div class="clinic-meta">
      ${addrParts.join("<br>")}
      ${data.clinic.phone ? "<br>Ph: " + data.clinic.phone : ""}
    </div>
  </div>

  <!-- INVOICE META -->
  <div class="invoice-meta">
    <div class="invoice-number">Invoice #INV-${data.invoice.invoiceNumber}</div>
    <div class="invoice-date">Date: ${data.invoice.date}</div>
  </div>

  <div class="patient-line">
    Patient: ${data.patient.name} &nbsp;·&nbsp; Age: ${data.patient.age} &nbsp;·&nbsp; Gender: ${data.patient.gender}
  </div>

  <!-- TABLE -->
  <table class="invoice-table">
    <thead>
      <tr>
        <th>Service</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${servicesRows}

      <!-- Total Payable — dark row -->
      <tr class="summary-row">
        <td>Total Payable</td>
        <td>${currency} ${(data.invoice.total || 0).toLocaleString()}</td>
      </tr>

      <!-- Collected -->
      <tr class="detail-row">
        <td>Collected</td>
        <td>${currency} ${(data.invoice.collected || 0).toLocaleString()}</td>
      </tr>

      ${balanceRow}

      <!-- Status -->
      <tr class="status-row">
        <td>Status</td>
        <td>${data.invoice.status}</td>
      </tr>
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    <div class="in-words">
      In Words: <span>${data.invoice.amountInWords}</span>
    </div>
    <div class="receipt">${receiptLine}</div>
  </div>

  <!-- SIGNATURE -->
  <div class="signature">
    <div class="sign-line"></div>
    <div class="sign-name">${data.doctor.name}</div>
    <div class="sign-title">Authorised Signatory</div>
  </div>

</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────
// ROUTE
// ─────────────────────────────────────────────

router.post(
    "/add_appointment",
    fetchuser,
    requireSubscription,
    upload.single("image"),
    async (req, res) => {
        try {
            const doctorId = req.user.doctorId;

            // ── PARSE BODY ──────────────────────────────────────────────────
            const patientId = req.body.patientId;
            const services = JSON.parse(req.body.services || "[]");
            const payment_type = req.body.payment_type || null;
            const date = req.body.date || null;
            const discount = Number(req.body.discount) || 0;
            const isPercent = req.body.isPercent === "true";
            const collected = Math.max(Number(req.body.collected) || 0, 0);
            const time = req.body.time || null;
            const paymentMethodId = req.body.paymentMethodId || null;
            const categoryName = req.body.categoryName || null;

            if (!patientId) {
                return res
                    .status(400)
                    .json({ success: false, message: "patientId is required" });
            }

            // ── VALIDATE FILE ───────────────────────────────────────────────
            if (req.file) {
                if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Invalid file type. Only JPEG, PNG, WEBP, GIF allowed.",
                    });
                }
                if (req.file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
                    return res.status(400).json({
                        success: false,
                        message: `File too large. Max ${MAX_FILE_SIZE_MB}MB allowed.`,
                    });
                }
            }

            // ── FETCH DOCTOR, PRICING, PATIENT IN PARALLEL ─────────────────
            const doctor = req.doctor;
            const [pricing, patient] = await Promise.all([
                getPricing(),
                Patient.findById(patientId),
            ]);

            if (!doctor)
                return res
                    .status(404)
                    .json({ success: false, message: "Doctor not found" });
            if (!pricing)
                return res.status(500).json({
                    success: false,
                    message: "Pricing config missing",
                });
            if (!patient)
                return res
                    .status(404)
                    .json({ success: false, message: "Patient not found" });

            if (patient.doctor.toString() !== doctorId) {
                return res
                    .status(403)
                    .json({ success: false, message: "Unauthorized access" });
            }

            const plan = doctor.subscription?.plan?.toLowerCase() || "free";
            const planData = pricing[plan] || {};

            // ── VALIDATE SERVICES ───────────────────────────────────────────
            if (!Array.isArray(services) || services.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Service must be a non-empty array",
                });
            }
            for (const s of services) {
                if (!s || typeof s !== "object")
                    return res.status(400).json({
                        success: false,
                        message: "Invalid service object",
                    });
                if (!s.name || typeof s.name !== "string" || !s.name.trim())
                    return res.status(400).json({
                        success: false,
                        message: "Each service must have a valid name",
                    });
                if (
                    s.amount === undefined ||
                    s.amount === null ||
                    isNaN(Number(s.amount))
                )
                    return res.status(400).json({
                        success: false,
                        message: "Each service must have a valid amount",
                    });
                if (Number(s.amount) < 0)
                    return res.status(400).json({
                        success: false,
                        message: "Service amount cannot be negative",
                    });
            }

            const normalizedServices = services.map((s) => ({
                id: s.id || null,
                name: s.name.trim(),
                amount: Number(s.amount),
            }));

            // ── BILLING CALCULATIONS ────────────────────────────────────────
            const serviceTotal = normalizedServices.reduce(
                (sum, s) => sum + s.amount,
                0,
            );
            const percentFlag = Boolean(isPercent);
            let discountValue = percentFlag
                ? serviceTotal * (discount / 100)
                : discount;
            discountValue = Number(
                Math.min(Math.max(discountValue, 0), serviceTotal).toFixed(0),
            );
            const finalAmount = Number(
                (serviceTotal - discountValue).toFixed(0),
            );
            const collectedAmount = Math.min(
                Math.max(Number(collected) || 0, 0),
                finalAmount,
            );

            if (collectedAmount > finalAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Collected amount cannot exceed final amount",
                });
            }

            const remainingAmount = finalAmount - collectedAmount;
            const paymentStatus =
                remainingAmount === 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // ── IMAGE UPLOAD (atomic, race-condition safe) ──────────────────
            const imageLimit = planData?.imageLimit ?? 0;
            if (
                req.file &&
                imageLimit !== -1 &&
                doctor.usage?.imageUploads >= imageLimit
            ) {
                return res.status(403).json({
                    success: false,
                    message: "Image upload limit reached. Upgrade required.",
                });
            }

            let imageUrl = "";
            if (req.file) {
                const updatedDoc = await Doc.findOneAndUpdate(
                    {
                        _id: doctorId,
                        ...(imageLimit !== -1 && {
                            "usage.imageUploads": { $lt: imageLimit },
                        }),
                    },
                    { $inc: { "usage.imageUploads": 1 } },
                    { new: true },
                );
                if (!updatedDoc) {
                    return res.status(403).json({
                        success: false,
                        message:
                            "Image upload limit reached. Upgrade required.",
                    });
                }
                try {
                    const result = await uploadToCloudinary(req.file.buffer);
                    imageUrl = result.secure_url;
                } catch (cloudinaryErr) {
                    await Doc.updateOne(
                        { _id: doctorId },
                        { $inc: { "usage.imageUploads": -1 } },
                    );
                    console.error("Cloudinary upload failed:", cloudinaryErr);
                    return res.status(502).json({
                        success: false,
                        message: "Image upload failed. Appointment not saved.",
                    });
                }
            }

            // ── INVOICE COUNTER ─────────────────────────────────────────────
            const counter = await Counter.findByIdAndUpdate(
                `invoice_${doctorId}`,
                { $inc: { seq: 1 } },
                { new: true, upsert: true },
            );
            const invoiceNumber = counter.seq;

            // ── DATES & LOCALE ──────────────────────────────────────────────
            const visitDate = date ? new Date(date) : new Date();
            const visitDateISO = visitDate.toISOString(); // for n8n
            const countryCode = doctor.address?.countryCode || "US";
            const locale = getLocaleFromCountry(countryCode);
            const formattedDate = visitDate.toLocaleDateString(locale, {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
            const formattedTime = time
                ? new Date(`1970-01-01T${time}`).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                  })
                : "";

            // ── CURRENCY ────────────────────────────────────────────────────
            const currencyCode = doctor.subscription?.currency || "INR";
            const currencySymbol =
                currencySymbolMap[currencyCode] || currencyCode;
            const words = isIndianCurrency(currencyCode)
                ? numberToWords(collectedAmount)
                : numberToWordsInternational(collectedAmount);
            const amountInWords = `${getCurrencyLabel(currencyCode)} ${words} Only`;

            // ── PHONE DECRYPT ───────────────────────────────────────────────
            const docData = await Doc.findById(doctorId).lean();

            let phone = "";
            try {
                phone = docData.phoneEncrypted
                    ? decrypt(docData.phoneEncrypted)
                    : "";
            } catch {
                phone = doctor.phoneLast4 ? `****${doctor.phoneLast4}` : "";
            }

            // ── SAVE APPOINTMENT TO DB ──────────────────────────────────────
            const visitData = {
                service: normalizedServices,
                amount: finalAmount,
                collected: collectedAmount,
                remaining: remainingAmount,
                status: paymentStatus,
                paymentMethodId: paymentMethodId || null,
                categoryName: categoryName || null,
                invoiceNumber,
                date: visitDate,
                discount,
                isPercent: percentFlag,
                time: time || null,
                image: imageUrl,
            };

            const appointment = await Appointment.findOneAndUpdate(
                { patient: patientId, doctor: doctorId },
                { $push: { visits: visitData } },
                { new: true, upsert: true },
            );

            // ── UPDATE PATIENT lastAppointment ──────────────────────────────
            const currentLast = patient.lastAppointment
                ? new Date(patient.lastAppointment)
                : null;
            if (!currentLast || visitDate > currentLast) {
                patient.lastAppointment = visitDate;
                patient.lastpayment_type = payment_type;
                await patient.save();
            }

            if (patient.email) {
                (async () => {
                    try {
                        const invoiceHtml = buildInvoiceHTML({
                            currencySymbol,
                            clinic: {
                                name:
                                    docData?.clinicName ||
                                    doctor.clinicName ||
                                    "",
                                address:
                                    docData?.address || doctor.address || {},
                                phone,
                            },
                            doctor: {
                                name: docData?.name || doctor.name || "",
                                qualification:
                                    docData?.degree?.join(", ") ||
                                    doctor.degree?.join(", ") ||
                                    "",
                                regNo:
                                    docData?.regNumber ||
                                    doctor.regNumber ||
                                    "",
                                email: docData?.email || doctor.email || "",
                            },
                            patient: {
                                name: patient.name,
                                age: patient.age,
                                gender: patient.gender,
                            },
                            appointment: {
                                date: formattedDate,
                                time: formattedTime,
                            },
                            invoice: {
                                invoiceNumber,
                                services: normalizedServices,
                                total: finalAmount,
                                collected: collectedAmount,
                                balance: remainingAmount,
                                status: paymentStatus,
                                amountInWords,
                                date: formattedDate,
                            },
                        });

                        const browser = await puppeteer.launch({
                            args: ["--no-sandbox", "--disable-setuid-sandbox"],
                        });
                        const page = await browser.newPage();
                        await page.setContent(invoiceHtml, {
                            waitUntil: "networkidle0",
                        });
                        const pdf = await page.pdf({ format: "A4" });
                        await browser.close();

                        await fetch(
                            "https://patient-email.onrender.com/webhook/patient-appointment",
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    pdf: Buffer.from(pdf).toString("base64"),
                                    data: {
                                        locale,
                                        patient: {
                                            name: patient.name,
                                            email: patient.email,
                                        },
                                        doctor: {
                                            name:
                                                docData?.name ||
                                                doctor.name ||
                                                "",
                                            email:
                                                docData?.email ||
                                                doctor.email ||
                                                "",
                                            qualification:
                                                docData?.degree?.join(", ") ||
                                                doctor.degree?.join(", ") ||
                                                "",
                                            regNo:
                                                docData?.regNumber ||
                                                doctor.regNumber ||
                                                "",
                                            clinicName:
                                                docData?.clinicName ||
                                                doctor.clinicName ||
                                                "",
                                            phone: phone,
                                            address:
                                                docData?.address ||
                                                doctor.address ||
                                                {},
                                        },
                                        appointment: {
                                            date: visitDateISO,
                                            time: formattedTime,
                                        },
                                        invoice: {
                                            invoiceNumber,
                                            total: finalAmount,
                                            amountInWords,
                                            status: paymentStatus,
                                            currencySymbol,
                                        },
                                    },
                                }),
                            },
                        );
                    } catch (emailErr) {
                        console.error("Email/PDF dispatch failed:", emailErr);
                    }
                })();
            }

            // ── RESPOND ─────────────────────────────────────────────────────
            return res.status(201).json({
                success: true,
                message: "Appointment added successfully",
                appointment,
            });
        } catch (err) {
            console.error("Add Appointment Error:", err);
            return res
                .status(500)
                .json({ success: false, message: "Server error" });
        }
    },
);

module.exports = router;
