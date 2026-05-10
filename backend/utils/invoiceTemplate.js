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
            return (
                tens[Math.floor(n / 10)] + (n % 10 ? " " + below20[n % 10] : "")
            );
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
            return (
                tens[Math.floor(n / 10)] + (n % 10 ? " " + below20[n % 10] : "")
            );
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
    const esc = (s) =>
        String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
    </head>
    <body
        style="
            margin: 0;
            padding: 0;
            background: #f0ede8;
            font-family:
                -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Arial,
                sans-serif;
        "
    >
        <div style="max-width: 520px; margin: 0 auto; padding: 40px 16px 60px">
            <!-- Brand -->

            <!-- Card -->
            <div
                style="
                    background: #fff;
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.07);
                "
            >
                <!-- Hero -->
                <div style="background: #0f1923; padding: 44px 44px 36px">
                    <div style="text-align: center; margin-bottom: 24px">
                        <img
                            src="https://invohealth.vercel.app/logo.jpg"
                            width="48"
                            height="48"
                            style="
                                border-radius: 50%;
                                display: block;
                                margin: 0 auto 8px;
                            "
                        />
                        <div
                            style="
                                font-size: 25px;
                                font-weight: 600;
                                color: #ffffff;
                                letter-spacing: -0.5px;
                            "
                        >
                            Invo<span style="font-style: italic; color: #2a62b7"
                                >Health</span
                            >
                        </div>
                    </div>
                    <div
                        style="
                            font-size: 10px;
                            letter-spacing: 0.18em;
                            text-transform: uppercase;
                            color: #4a8c7a;
                            margin-bottom: 12px;
                        "
                    >
                        Appointment Confirmed
                    </div>
                    <h1
                        style="
                            font-size: 28px;
                            color: #fff;
                            margin: 0 0 4px;
                            font-weight: 700;
                            line-height: 1.2;
                        "
                    >
                        Your visit has been<br /><em
                            style="font-style: italic; color: #a8d5c8"
                            >recorded</em
                        >
                    </h1>
                    <p
                        style="
                            font-size: 13px;
                            color: rgba(255, 255, 255, 0.38);
                            margin-top: 10px;
                            line-height: 1.6;
                        "
                    >
                        Hi ${esc(patient.name)}, your appointment details are
                        confirmed below.
                    </p>
                </div>

                <!-- Gradient strip -->
                <div
                    style="
                        height: 3px;
                        background: linear-gradient(
                            90deg,
                            #2db891,
                            #a8d5c8,
                            #f0ede8
                        );
                    "
                ></div>

                <!-- Body -->
                <div style="padding: 40px 44px">
                    <!-- Visit details -->
                    <div
                        style="
                            background: #f7f5f2;
                            border: 1px solid #e8e3db;
                            border-radius: 14px;
                            overflow: hidden;
                            margin-bottom: 28px;
                        "
                    >
                        <div
                            style="
                                padding: 14px 20px;
                                border-bottom: 1px solid #e8e3db;
                                display: flex;
                                justify-content: space-between;
                            "
                        >
                            <span
                                style="
                                    font-size: 11px;
                                    letter-spacing: 0.1em;
                                    text-transform: uppercase;
                                    color: #9ca3af;
                                "
                                >Doctor</span
                            >
                            <span
                                style="
                                    font-size: 13px;
                                    font-weight: 600;
                                    color: #0f1923;
                                "
                                >Dr. ${esc(doctor.name)}</span
                            >
                        </div>
                        <div
                            style="
                                padding: 14px 20px;
                                border-bottom: 1px solid #e8e3db;
                                display: flex;
                                justify-content: space-between;
                            "
                        >
                            <span
                                style="
                                    font-size: 11px;
                                    letter-spacing: 0.1em;
                                    text-transform: uppercase;
                                    color: #9ca3af;
                                "
                                >Center</span
                            >
                            <span
                                style="
                                    font-size: 13px;
                                    font-weight: 600;
                                    color: #0f1923;
                                "
                                >${esc(doctor.clinicName || "—")}</span
                            >
                        </div>
                        <div
                            style="
                                padding: 14px 20px;
                                border-bottom: 1px solid #e8e3db;
                                display: flex;
                                justify-content: space-between;
                            "
                        >
                            <span
                                style="
                                    font-size: 11px;
                                    letter-spacing: 0.1em;
                                    text-transform: uppercase;
                                    color: #9ca3af;
                                "
                                >Date</span
                            >
                            <span
                                style="
                                    font-size: 13px;
                                    font-weight: 600;
                                    color: #0f1923;
                                "
                                >${esc(formattedDate)}</span
                            >
                        </div>
                        <div
                            style="
                                padding: 14px 20px;
                                display: flex;
                                justify-content: space-between;
                            "
                        >
                            <span
                                style="
                                    font-size: 11px;
                                    letter-spacing: 0.1em;
                                    text-transform: uppercase;
                                    color: #9ca3af;
                                "
                                >Time</span
                            >
                            <span
                                style="
                                    font-size: 13px;
                                    font-weight: 600;
                                    color: #0f1923;
                                "
                                >${esc(formattedTime) || "—"}</span
                            >
                        </div>
                    </div>

                    <!-- How to view invoice -->
                    <div
                        style="
                            background: #f0fdf8;
                            border: 1px solid #bbf7e0;
                            border-left: 3px solid #2db891;
                            border-radius: 8px;
                            padding: 16px 18px;
                            margin-bottom: 28px;
                        "
                    >
                        <p
                            style="
                                font-size: 11px;
                                font-weight: 700;
                                letter-spacing: 0.1em;
                                text-transform: uppercase;
                                color: #2db891;
                                margin: 0 0 10px;
                            "
                        >
                            How to view your invoice
                        </p>
                        <ol
                            style="
                                padding-left: 16px;
                                margin: 0;
                                font-size: 13px;
                                color: #374151;
                                line-height: 2;
                            "
                        >
                            <li>
                                Click <strong>Open Patient Portal</strong> below
                            </li>
                            <li>Login with your email — an OTP will be sent</li>
                            <li>
                                Tap your doctor's name →
                                <strong>History</strong>
                            </li>
                            <li>Download or request invoice via email</li>
                        </ol>
                    </div>

                    <!-- CTA -->
                    <div style="text-align: center; margin-bottom: 28px">
                        <a
                            href="https://invohealth-patient.vercel.app"
                            style="
                                display: inline-block;
                                background: #2db891;
                                color: #fff;
                                padding: 14px 32px;
                                border-radius: 50px;
                                text-decoration: none;
                                font-size: 14px;
                                font-weight: 700;
                                letter-spacing: 0.03em;
                            "
                        >
                            Open Patient Portal →
                        </a>
                    </div>

                    <!-- Warning -->
                    <div
                        style="
                            background: #fffbeb;
                            border: 1px solid #fde68a;
                            border-left: 3px solid #f59e0b;
                            border-radius: 8px;
                            padding: 12px 14px;
                            font-size: 11px;
                            color: #92400e;
                            line-height: 1.6;
                        "
                    >
                        ⚠ InvoHealth will <strong>never</strong> ask for your
                        OTP via phone or chat. Do not share it with anyone.
                    </div>
                </div>

                <!-- Footer -->
                <div
                    style="
                        background: #f7f5f2;
                        border-top: 1px solid #e8e3db;
                        padding: 20px 44px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    "
                >
                    <!-- <div style="display: flex; gap: 16px">
                        <a
                            href="https://invohealth.vercel.app/terms"
                            style="
                                font-size: 11px;
                                color: #9ca3af;
                                text-decoration: none;
                            "
                            >Terms</a
                        >
                        <a
                            href="https://invohealth.vercel.app/privacy"
                            style="
                                font-size: 11px;
                                color: #9ca3af;
                                text-decoration: none;
                            "
                            >Privacy</a
                        >
                    </div> -->
                    <span style="font-size: 11px; color: #c4bdb5"
                        >© 2026 InvoHealth</span
                    >
                </div>
            </div>

            <p
                style="
                    text-align: center;
                    margin-top: 24px;
                    font-size: 10px;
                    color: #b0a89e;
                    line-height: 1.7;
                "
            >
                This is an automatically generated email. Please do not reply.
            </p>
        </div>
    </body>
</html>
`;
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
