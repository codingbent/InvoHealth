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

function getCurrencyLabel(code) {
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
  return map[code] || code;
}

function getLocaleFromCountry(countryCode) {
  const map = {
    IN: "en-IN",
    US: "en-US",
    GB: "en-GB",
    AU: "en-AU",
    CA: "en-CA",
    AE: "en-AE",
    SG: "en-SG",
    JP: "ja-JP",
    CN: "zh-CN",
    KR: "ko-KR",
  };
  return map[countryCode] || "en-US";
}

function isIndianCurrency(code) {
  return code === "INR";
}

function numberToWords(num) {
  const below20 = [
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
    if (n === 0) return "";
    if (n < 20) return below20[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + below20[n % 10] : "");
    if (n < 1e3)
      return (
        below20[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convert(n % 100) : "")
      );
    if (n < 1e5)
      return (
        convert(Math.floor(n / 1e3)) +
        " Thousand" +
        (n % 1e3 ? " " + convert(n % 1e3) : "")
      );
    if (n < 1e7)
      return (
        convert(Math.floor(n / 1e5)) +
        " Lakh" +
        (n % 1e5 ? " " + convert(n % 1e5) : "")
      );
    return (
      convert(Math.floor(n / 1e7)) +
      " Crore" +
      (n % 1e7 ? " " + convert(n % 1e7) : "")
    );
  }
  return convert(Math.round(num)) || "Zero";
}

function numberToWordsInternational(num) {
  const below20 = [
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
    if (n === 0) return "";
    if (n < 20) return below20[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + below20[n % 10] : "");
    if (n < 1e3)
      return (
        below20[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + convert(n % 100) : "")
      );
    if (n < 1e6)
      return (
        convert(Math.floor(n / 1e3)) +
        " Thousand" +
        (n % 1e3 ? " " + convert(n % 1e3) : "")
      );
    if (n < 1e9)
      return (
        convert(Math.floor(n / 1e6)) +
        " Million" +
        (n % 1e6 ? " " + convert(n % 1e6) : "")
      );
    return (
      convert(Math.floor(n / 1e9)) +
      " Billion" +
      (n % 1e9 ? " " + convert(n % 1e9) : "")
    );
  }
  return convert(Math.round(num)) || "Zero";
}

function buildAppointmentEmail({
  patient,
  doctor,
  formattedDate,
  formattedTime,
}) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.05)">
  <div style="background:#0f172a;padding:18px 20px;text-align:center">
    <img src="https://invohealth.vercel.app/logo.jpg" alt="InvoHealth" style="height:36px;margin-right:10px;vertical-align:middle"/>
    <span style="color:#fff;font-size:18px;font-weight:600;vertical-align:middle">InvoHealth</span>
  </div>
  <div style="padding:24px">
    <h2 style="color:#1e3a8a;margin-top:0">Hi ${patient.name},</h2>
    <p style="color:#374151;font-size:14px">Your invoice for your recent visit to <strong>Dr. ${doctor.name}</strong> is ready.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb"><strong>Date</strong></td>
        <td style="padding:10px;border:1px solid #e5e7eb">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb"><strong>Time</strong></td>
        <td style="padding:10px;border:1px solid #e5e7eb">${formattedTime || "—"}</td>
      </tr>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="https://invohealth-patient.vercel.app" style="background:#3b6ff5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">Open Patient Portal</a>
    </div>
    <div style="background:#f8faff;padding:16px;border-radius:10px;border:1px solid #e0e7ff">
      <p style="margin-top:0"><strong>How to view your invoice:</strong></p>
      <ol style="padding-left:18px;font-size:14px;color:#374151;line-height:1.8">
        <li>Click <strong>"Open Patient Portal"</strong></li>
        <li>Login using your email (OTP will be sent)</li>
        <li>Click your doctor's name → <strong>History</strong></li>
        <li>Download invoice or request via email</li>
      </ol>
    </div>
    <p style="margin-top:20px;font-size:13px;color:#6b7280">You can access all your invoices anytime from the portal.</p>
  </div>
  <div style="padding:16px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb">
    This is an automatically generated email. Please do not reply.
  </div>
</div>
</body></html>`;
}

function buildInvoiceHTML(data) {
  const currency = data.currencySymbol || "";
  const locale = data.locale || "en-US";

  const formatMoney = (val) =>
    new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(val || 0);

  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");

  const servicesRows = data.invoice.services
    .map(
      (s) => `
        <tr>
          <td style="padding:12px 16px;font-size:14px;color:#374151;border-bottom:1px solid #e5e7eb">${esc(s.name)}</td>
          <td style="padding:12px 16px;font-size:14px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb">
            ${currency} ${formatMoney(Number(s.amount))}
          </td>
        </tr>`,
    )
    .join("");

  const balanceRow =
    data.invoice.balance > 0
      ? `
        <tr class="balance-row">
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb">
            Balance Due
          </td>
          <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#ef4444;text-align:right;border-bottom:1px solid #e5e7eb">
            ${currency} ${formatMoney(data.invoice.balance)}
          </td>
        </tr>`
      : "";

  const receiptLine =
    data.invoice.status === "Paid"
      ? `Received with thanks from <strong>${esc(data.patient.name)}</strong> the sum of <strong>${currency} ${formatMoney(data.invoice.total)}</strong> only.`
      : `Payment partially received. Remaining balance pending.`;

  const addrParts = [
    data.clinic.address?.line1,
    data.clinic.address?.line2,
    data.clinic.address?.line3,
    [data.clinic.address?.city, data.clinic.address?.state]
      .filter(Boolean)
      .join(", "),
    data.clinic.address?.pincode,
  ].filter(Boolean);

  return `<!doctype html>
<html>
    <head>
        <meta charset="UTF-8" />
        <style>
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                background: #f3f4f6;
                font-family:
                    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                    Arial, sans-serif;
                color: #111827;
            }

            .page {
                width: 794px;
                min-height: 1123px;
                margin: 0 auto;
                background: #fff;
                padding: 48px 52px;
                position: relative;
            }

            /* watermark */
            .page::after {
                content: "INVOHEALTH";
                position: absolute;
                top: 45%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-20deg);
                font-size: 72px;
                font-weight: 800;
                color: rgba(17, 24, 39, 0.035);
            }

            /* header */
            .header {
                display: flex;
                justify-content: space-between;
                padding-bottom: 24px;
                border-bottom: 2px solid #111827;
            }

            /* invoice meta */
            .invoice-meta {
                display: flex;
                justify-content: space-between;
                margin-top: 22px;
            }

            /* ===== TABLE FIXED ===== */
            .invoice-table {
                width: 100%;
                border-collapse: collapse; /* FIX */
                border-spacing: 0; /* FIX */
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                overflow: hidden;
            }

            /* cells */
            .invoice-table th,
            .invoice-table td {
                padding: 16px 20px;
                font-size: 14px;
                border: 1px solid #e5e7eb;
            }

            /* header style */
            .invoice-table thead th {
                background: #f9fafb;
                font-weight: 700;
            }

            /* alignment */
            .invoice-table th:last-child,
            .invoice-table td:last-child {
                text-align: right;
            }

            /* remove outer duplicate borders */
            .invoice-table tr:first-child th {
                border-top: none;
            }

            .invoice-table tr:last-child td {
                border-bottom: none;
            }

            .invoice-table th:first-child,
            .invoice-table td:first-child {
                border-left: none;
            }

            .invoice-table th:last-child,
            .invoice-table td:last-child {
                border-right: none;
            }

            /* highlight rows */
            .summary-row td {
                font-weight: 700;
            }

            .detail-row td {
                font-weight: 600;
            }

            .balance-row td {
                background: #fff !important;
            }

            /* footer */
            .footer {
                margin-top: 28px;
                border-top: 1px solid #e5e7eb;
                padding-top: 16px;
                font-size: 13px;
                color: #6b7280;
            }

            /* signature */
            .signature {
                text-align: right;
                margin-top: 60px;
                font-weight: 700;
            }
        </style>
    </head>

    <body>
        <div class="page">
            <div class="header">
                <div>
                    <div style="font-weight: 800; font-size: 24px">
                        ${esc(data.clinic.name)}
                    </div>
                    <div style="font-size: 14px; color: #4b5563">
                        <strong style="font-size: 16px"
                            >${esc(data.doctor.name)}</strong
                        ><br />
                        ${data.doctor.qualification}<br />
                        Reg No: ${data.doctor.regNo}
                    </div>
                </div>

                <div style="text-align: right; font-size: 13px; color: #4b5563">
                    ${addrParts.join("<br />")}
                </div>
            </div>

            <div class="invoice-meta">
                <div>
                    <strong>Invoice #INV-${data.invoice.invoiceNumber}</strong>
                </div>
                <div>${data.invoice.date}</div>
            </div>

            <div
                style="
                    margin: 18px 0;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 12px;
                "
            >
                Patient: ${data.patient.name}
            </div>

            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Service</th>
                        <th>Amount</th>
                    </tr>
                </thead>

                <tbody>
${servicesRows}

${
  data.invoice.discount > 0
    ? `
<tr class="detail-row">
    <td>Subtotal</td>
    <td>
        ${currency} ${formatMoney(data.invoice.total + data.invoice.discount)}
    </td>
</tr>

<tr class="detail-row">
    <td>
        Discount ${
          data.invoice.isPercent
            ? `(${Math.round(
                (data.invoice.discount /
                  (data.invoice.total + data.invoice.discount)) *
                  100,
              )}%)`
            : "(flat)"
        }
    </td>
    <td style="color:#ef4444">
        - ${currency} ${formatMoney(data.invoice.discount)}
    </td>
</tr>
`
    : ""
}

<tr class="summary-row">
    <td>Total Payable</td>
    <td>${currency} ${formatMoney(data.invoice.total)}</td>
</tr>

<tr class="detail-row">
    <td>Collected</td>
    <td>${currency} ${formatMoney(data.invoice.collected)}</td>
</tr>

${balanceRow}

<tr>
    <td>Status</td>
    <td>${data.invoice.status}</td>
</tr>
</tbody>
            </table>

            <div class="footer">
                <div>
                    <strong>In Words:</strong> ${data.invoice.amountInWords}
                </div>
                <div>${receiptLine}</div>
            </div>

            <!-- Authorized Signatory -->
            <div class="signature">
                <div>${data.doctor.name}</div>
                <div
                    style="
                        font-weight: 400;
                        font-size: 12px;
                        color: #6b7280;
                        margin-top: 4px;
                    "
                >
                    Authorised Signatory
                </div>
            </div>
        </div>
    </body>
</html>
`;
}

const COUNTRY_LOCALE_MAP = {
  IN: "en-IN",
  US: "en-US",
  GB: "en-GB",
  AU: "en-AU",
  CA: "en-CA",
  AE: "en-AE",
  SG: "en-SG",
  JP: "ja-JP",
  CN: "zh-CN",
  FR: "fr-FR",
  DE: "de-DE",
  IT: "it-IT",
  ES: "es-ES",
  BR: "pt-BR",
};

module.exports = {
  buildInvoiceHTML,
  buildAppointmentEmail,
  currencySymbolMap,
  getCurrencyLabel,
  getLocaleFromCountry,
  isIndianCurrency,
  numberToWords,
  numberToWordsInternational,
  COUNTRY_LOCALE_MAP,
};
