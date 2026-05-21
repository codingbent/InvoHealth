import { toWords } from "number-to-words";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function generateInvoicePDF(
    visit,
    includeDiscount,
    doctor,
    details,
    showAlert,
) {
    if (!doctor) {
        showAlert("Doctor details not loaded yet!", "warning");
        return;
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

    const PDF_SYMBOL_MAP = {
        INR: "Rs.",
        USD: "$",
        GBP: "GBP",
        EUR: "EUR",
        CAD: "CAD",
        AUD: "AUD",
        SGD: "SGD",
        AED: "AED",
        JPY: "JPY",
        CNY: "CNY",
        CHF: "CHF",
        MYR: "MYR",
        THB: "THB",
        IDR: "IDR",
        PHP: "PHP",
        VND: "VND",
        KRW: "KRW",
        BDT: "BDT",
        PKR: "PKR",
        LKR: "LKR",
        NPR: "NPR",
        NZD: "NZD",
        ZAR: "ZAR",
        NGN: "NGN",
        KES: "KES",
        GHS: "GHS",
        EGP: "EGP",
        BRL: "BRL",
        MXN: "MXN",
        ARS: "ARS",
        TRY: "TRY",
        SAR: "SAR",
        QAR: "QAR",
        KWD: "KWD",
        BHD: "BHD",
        OMR: "OMR",
    };

    const CURRENCY_WORD_MAP = {
        INR: "Rupees",
        USD: "Dollars",
        GBP: "Pounds",
        EUR: "Euros",
        CAD: "Canadian Dollars",
        AUD: "Australian Dollars",
        SGD: "Singapore Dollars",
        AED: "Dirhams",
        JPY: "Yen",
        CNY: "Yuan",
        CHF: "Swiss Francs",
        MYR: "Ringgit",
        THB: "Baht",
        IDR: "Rupiah",
        PHP: "Pesos",
        VND: "Dong",
        KRW: "Won",
        BDT: "Taka",
        PKR: "Rupees",
        LKR: "Rupees",
        NPR: "Rupees",
        NZD: "New Zealand Dollars",
        ZAR: "Rand",
        NGN: "Naira",
        KES: "Shillings",
        GHS: "Cedis",
        EGP: "Pounds",
        BRL: "Reais",
        MXN: "Pesos",
        ARS: "Pesos",
        TRY: "Lira",
        SAR: "Riyals",
        QAR: "Riyals",
        KWD: "Dinars",
        BHD: "Dinars",
        OMR: "Riyals",
    };

    const fmt = (v) =>
        new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
            v,
        );

    try {
        const code = doctor.address?.currency || "INR";
        const pdfSymbol =
            PDF_SYMBOL_MAP[code] ?? doctor.currency?.symbol ?? code;
        const currencyWord = CURRENCY_WORD_MAP[code] ?? code;

        const docPdf = new jsPDF();

        // WATERMARK (TEXT ONLY)
        const addWatermark = () => {
            const pageWidth = docPdf.internal.pageSize.getWidth();
            const pageHeight = docPdf.internal.pageSize.getHeight();

            // TEXT WATERMARK (very light)
            docPdf.setTextColor(235, 235, 235); // softer than before
            docPdf.setFontSize(60);
            docPdf.setFont(undefined, "bold");

            docPdf.text("INVOHEALTH", pageWidth / 2, pageHeight / 2 + 10, {
                align: "center",
                angle: 15,
            });

            // IMAGE WATERMARK (SUBTLE + GREY LOOK)
            try {
                docPdf.setGState(new docPdf.GState({ opacity: 0.06 })); // KEY

                docPdf.addImage(
                    "https://invohealth.vercel.app/logo.jpg",
                    "JPEG",
                    pageWidth / 2 - 25,
                    pageHeight / 2 - 100,
                    50,
                    50,
                );

                docPdf.setGState(new docPdf.GState({ opacity: 1 }));
            } catch (e) {
                console.warn("Watermark image failed");
            }

            // reset text color
            docPdf.setTextColor(0, 0, 0);
        };

        addWatermark();

        const margin = 18;
        const pageWidth = docPdf.internal.pageSize.getWidth();
        const invoiceNumber = visit.invoiceNumber || "N/A";

        // const drawLine = (y, r = 180, g = 180, b = 180) => {
        //     docPdf.setDrawColor(r, g, b);
        //     docPdf.setLineWidth(0.3);
        //     docPdf.line(margin, y, pageWidth - margin, y);
        // };

        let leftY = 18,
            rightY = 18;

        // HEADER
        docPdf.setFontSize(13);
        docPdf.setFont(undefined, "bold");
        docPdf.setTextColor(20, 20, 20);
        docPdf.text(doctor.clinicName || "", margin, leftY);
        leftY += 6;

        docPdf.setFontSize(10);
        docPdf.setTextColor(40, 40, 40);
        docPdf.text(doctor.name || "", margin, leftY);
        leftY += 5;

        docPdf.setFontSize(8.5);
        docPdf.setTextColor(110, 110, 110);

        if (doctor.degree?.length) {
            docPdf.text(doctor.degree.join(", "), margin, leftY);
            leftY += 4.5;
        }
        if (doctor.regNumber) {
            docPdf.text(`Reg No: ${doctor.regNumber}`, margin, leftY);
            leftY += 4.5;
        }

        if (doctor.address?.line1) {
            docPdf.text(doctor.address.line1, pageWidth - margin, rightY, {
                align: "right",
            });
            rightY += 4.5;
        }
        if (doctor.address?.line2) {
            docPdf.text(doctor.address.line2, pageWidth - margin, rightY, {
                align: "right",
            });
            rightY += 4.5;
        }
        if (doctor.address?.line3) {
            docPdf.text(doctor.address.line3, pageWidth - margin, rightY, {
                align: "right",
            });
            rightY += 4.5;
        }

        // City + State in one line
        const cityState = [doctor.address?.city, doctor.address?.state]
            .filter(Boolean)
            .join(", ");

        if (cityState) {
            docPdf.text(cityState, pageWidth - margin, rightY, {
                align: "right",
            });
            rightY += 4.5;
        }
        if (doctor.address?.pincode) {
            docPdf.text(doctor.address.pincode, pageWidth - margin, rightY, {
                align: "right",
            });
            rightY += 4.5;
        }

        const afterHeader = Math.max(leftY, rightY) + 5;
        docPdf.setLineWidth(0.6);
        docPdf.line(margin, afterHeader, pageWidth - margin, afterHeader);

        let y = afterHeader + 7;

        // INVOICE TITLE
        docPdf.setFontSize(9);
        docPdf.setFont(undefined, "bold");
        docPdf.setTextColor(30, 30, 30);
        docPdf.text(`INVOICE  #INV-${invoiceNumber}`, margin, y);

        const countryCode = doctor.address?.country || "IN";

        const locale = COUNTRY_LOCALE_MAP[countryCode] || "en-IN";

        const dateStr = new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
        }).format(new Date(visit.date));
        docPdf.setFont(undefined, "normal");
        docPdf.setTextColor(110, 110, 110);
        docPdf.text(`Date: ${dateStr}`, pageWidth - margin, y, {
            align: "right",
        });

        y += 5;

        docPdf.setFontSize(8.5);
        docPdf.setTextColor(80, 80, 80);
        docPdf.text(
            `Patient: ${details.name} · Age: ${details?.age > 0 ? details.age : "0" || ""} · Gender: ${
                details.gender || "-"
            }`,
            margin,
            y,
        );

        y += 10;

        // DATA
        const services = visit.service || [];

        const serviceRows = services.map((s) => [
            s.name,
            `${pdfSymbol} ${fmt(s.amount)}`,
        ]);

        const rawTotal = services.reduce(
            (sum, s) => sum + Number(s.amount || 0),
            0,
        );

        const discountRaw = Number(visit.discount || 0);

        let discountValue = 0;

        if (includeDiscount && discountRaw > 0) {
            discountValue = visit.isPercent
                ? Math.round((rawTotal * discountRaw) / 100)
                : discountRaw;
        }

        const total = includeDiscount
            ? Number(visit.collected + visit.remaining ?? rawTotal)
            : rawTotal;

        const collected = Number(visit.collected ?? 0);

        const remaining = includeDiscount
            ? total - collected
            : rawTotal - collected;

        const paymentStatus =
            remaining <= 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

        const displayCollected = collected;
        const displayAmt = total;
        const remainingAmount = remaining;

        const receiptText =
            paymentStatus === "Paid"
                ? `Received with thanks from ${details.name} the sum of ${pdfSymbol} ${fmt(displayCollected)} only.`
                : paymentStatus === "Partial"
                  ? `Part payment of ${pdfSymbol} ${fmt(displayCollected)} received from ${details.name}. Balance of ${pdfSymbol} ${fmt(remainingAmount)} is pending.`
                  : `Total amount of ${pdfSymbol} ${fmt(displayAmt)} is pending from ${details.name}.`;

        const status =
            remaining <= 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

        const summaryRows = [
            ...(includeDiscount && discountValue > 0
                ? [
                      ["Subtotal", `${pdfSymbol} ${fmt(rawTotal)}`],
                      [
                          visit.isPercent
                              ? `Discount (${visit.discount}%)`
                              : "Discount",
                          `- ${pdfSymbol} ${fmt(discountValue)}`,
                      ],
                  ]
                : []),

            ["Total Payable", `${pdfSymbol} ${fmt(total)}`],
            ["Collected", `${pdfSymbol} ${fmt(collected)}`],
            ...(remaining > 0
                ? [["Balance Due", `${pdfSymbol} ${fmt(remaining)}`]]
                : []),
            ["Status", status],
        ];

        // TABLE (CLEAN — NO BACKGROUND)
        autoTable(docPdf, {
            startY: y,
            head: [["Service", "Amount"]],
            body: [...serviceRows, ...summaryRows],
            theme: "plain",

            styles: {
                fontSize: 10,
                textColor: [50, 50, 50],
                lineColor: [220, 220, 220],
                lineWidth: 0.2,
                cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
            },

            headStyles: {
                fontStyle: "bold",
                textColor: [30, 30, 30],
                cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
            },

            columnStyles: {
                0: { cellWidth: pageWidth - margin * 2 - 60 },
                1: { cellWidth: 60, halign: "right" },
            },

            tableWidth: "auto",

            didParseCell: (data) => {
                const isSummary = data.row.index >= serviceRows.length;

                // ALIGN HEADER "Amount" RIGHT
                if (data.section === "head" && data.column.index === 1) {
                    data.cell.styles.halign = "right";
                }

                if (isSummary) {
                    data.cell.styles.fontStyle = "bold";
                }

                // status color
                if (
                    data.row.index ===
                        serviceRows.length + summaryRows.length - 1 &&
                    data.column.index === 1
                ) {
                    data.cell.styles.textColor =
                        status === "Paid"
                            ? [22, 101, 52]
                            : status === "Partial"
                              ? [154, 52, 18]
                              : [153, 27, 27];
                }
            },
        });

        y = docPdf.lastAutoTable.finalY + 10;

        // FOOTER
        docPdf.setFontSize(8.5);
        docPdf.setTextColor(90, 90, 90);
        docPdf.text(
            `In Words: ${currencyWord} ${toWords(Math.round(includeDiscount ? total : rawTotal))} Only`,
            margin,
            y,
        );

        y += 6;

        // dynamic receipt text
        docPdf.setFontSize(8.5);
        docPdf.setTextColor(100, 100, 100);
        docPdf.text(receiptText, margin, y);

        y += 12;
        docPdf.setFontSize(9);
        docPdf.setTextColor(30, 30, 30);
        docPdf.text(doctor.name || "", pageWidth - margin, y, {
            align: "right",
        });

        y += 4;

        docPdf.setFontSize(8);
        docPdf.setTextColor(120, 120, 120);
        docPdf.text("Authorised Signatory", pageWidth - margin, y, {
            align: "right",
        });

        // SAVE
        const safeName = (details.name || "patient")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .trim()
            .replace(/\s+/g, "_");

        docPdf.save(`Invoice_${safeName}_INV${invoiceNumber}.pdf`);
    } catch (err) {
        console.error("PDF ERROR:", err);
    }
}
