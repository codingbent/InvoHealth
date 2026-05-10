const ExcelJS = require("exceljs");

const getExcelCurrencyFormat = (currencySymbol, locale = "en-IN") => {
    if (locale === "en-IN") {
        return `"${currencySymbol}"#,##,##0`;
    }

    return `"${currencySymbol}"#,##0`;
};

const addRowWithFormat = (
    sheet,
    label,
    value,
    currencyFormat,
    isCurrency = false,
    bold = false,
) => {
    const row = sheet.addRow([label, value]);

    if (bold) {
        row.font = { bold: true };
    }

    if (isCurrency) {
        row.getCell(2).numFmt = currencyFormat;
    }

    return row;
};

const computeVisitFinancials = (visit) => {
    const grossAmount = Number(visit.amount ?? 0);

    const discount = Number(visit.discount ?? 0);

    const isPercent = Boolean(visit.isPercent);

    let actualDiscount = 0;

    if (discount > 0) {
        actualDiscount = isPercent ? grossAmount * (discount / 100) : discount;
    }

    actualDiscount = Math.min(actualDiscount, grossAmount);

    const netAmount = Math.max(grossAmount - actualDiscount, 0);

    const rawCollected = Number(visit.collected ?? 0);

    const collected = Math.max(Math.min(rawCollected, netAmount), 0);

    const pending = Math.max(netAmount - collected, 0);

    let status = "Unpaid";

    if (pending <= 0) {
        status = "Paid";
    } else if (collected > 0) {
        status = "Partial";
    }

    return {
        grossAmount,
        actualDiscount,
        netAmount,
        collected,
        pending,
        status,
    };
};

const generateAppointmentExcel = async ({
    data,
    doctorName,
    currencySymbol = "₹",
    locale = "en-IN",
}) => {
    if (!Array.isArray(data) || !data.length) {
        throw new Error("No appointment data provided");
    }

    const currencyFormat = getExcelCurrencyFormat(currencySymbol, locale);

    const sorted = [...data].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
    );

    const financials = sorted.map(computeVisitFinancials);

    let totalGross = 0;

    let totalDiscount = 0;

    let totalNet = 0;

    let totalCollected = 0;

    let totalPending = 0;

    let paidCount = 0;

    let partialCount = 0;

    let unpaidCount = 0;

    financials.forEach((f) => {
        totalGross += f.grossAmount;

        totalDiscount += f.actualDiscount;

        totalNet += f.netAmount;

        totalCollected += f.collected;

        totalPending += f.pending;

        if (f.status === "Paid") {
            paidCount++;
        } else if (f.status === "Partial") {
            partialCount++;
        } else {
            unpaidCount++;
        }
    });

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "InvoHealth";

    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Visit Records");

    // HEADER

    sheet.addRow(["INVOHEALTH — MEDICAL CENTER RECORDS"]).font = {
        bold: true,
        size: 14,
    };

    sheet.addRow(["Doctor", doctorName || ""]).font = {
        bold: true,
    };

    sheet.addRow(["Generated", new Date().toLocaleDateString(locale)]);

    sheet.addRow([]);

    // FINANCIAL SUMMARY

    sheet.addRow(["FINANCIAL SUMMARY"]).font = {
        bold: true,
        size: 12,
    };

    addRowWithFormat(
        sheet,
        "Gross Amount",
        totalGross,
        currencyFormat,
        true,
        true,
    );

    addRowWithFormat(
        sheet,
        "Total Discount",
        totalDiscount,
        currencyFormat,
        true,
        true,
    );

    addRowWithFormat(sheet, "Net Amount", totalNet, currencyFormat, true, true);

    addRowWithFormat(
        sheet,
        "Collected",
        totalCollected,
        currencyFormat,
        true,
        true,
    );

    addRowWithFormat(
        sheet,
        "Pending",
        totalPending,
        currencyFormat,
        true,
        true,
    );

    sheet.addRow([]);

    // VISIT SUMMARY

    sheet.addRow(["VISIT SUMMARY"]).font = {
        bold: true,
        size: 12,
    };

    sheet.addRow(["Total Visits", sorted.length]);

    sheet.addRow(["Paid", paidCount]);

    sheet.addRow(["Partial", partialCount]);

    sheet.addRow(["Unpaid", unpaidCount]);

    sheet.addRow([]);

    // COLLECTION BY PAYMENT MODE

    const paymentSummary = {};

    sorted.forEach((visit, index) => {
        const key = visit.payment_type || "Other";

        paymentSummary[key] =
            (paymentSummary[key] || 0) + financials[index].collected;
    });

    sheet.addRow(["COLLECTION BY PAYMENT MODE"]).font = {
        bold: true,
        size: 12,
    };

    Object.entries(paymentSummary)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, amount]) => {
            const percent =
                totalCollected > 0
                    ? ((amount / totalCollected) * 100).toFixed(1)
                    : "0.0";

            const row = sheet.addRow([type, amount, `${percent}%`]);

            row.getCell(2).numFmt = currencyFormat;
        });

    sheet.addRow([]);

    // DETAILED RECORDS

    sheet.addRow(["DETAILED RECORDS"]).font = {
        bold: true,
        size: 12,
    };

    sheet.addRow([]);

    let currentDay = null;

    let dayGross = 0;

    let dayDiscount = 0;

    let dayNet = 0;

    let dayCollected = 0;

    let dayPending = 0;

    sorted.forEach((visit, index) => {
        const f = financials[index];

        const day = visit.date;

        if (day !== currentDay) {
            if (currentDay !== null) {
                const totalRow = sheet.addRow([
                    "",
                    "",
                    "",
                    "DAY TOTAL →",
                    dayGross,
                    dayDiscount,
                    dayNet,
                    dayCollected,
                    dayPending,
                ]);

                totalRow.font = {
                    bold: true,
                };

                [6, 7, 8, 9, 10].forEach((c) => {
                    totalRow.getCell(c).numFmt = currencyFormat;
                });

                sheet.addRow([]);
            }

            currentDay = day;

            dayGross = 0;

            dayDiscount = 0;

            dayNet = 0;

            dayCollected = 0;

            dayPending = 0;

            sheet.addRow([
                new Date(day).toLocaleDateString(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                }),
            ]).font = {
                bold: true,
                size: 11,
            };

            const header = sheet.addRow([
                "Patient",
                "Services",
                "Payment",
                "Status",
                "Gross",
                "Discount",
                "Net",
                "Collected",
                "Pending",
                "Invoice",
            ]);

            header.font = {
                bold: true,
                color: {
                    argb: "FFFFFFFF",
                },
            };

            header.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb: "FF1E293B",
                    },
                };
            });
        }

        dayGross += f.grossAmount;

        dayDiscount += f.actualDiscount;

        dayNet += f.netAmount;

        dayCollected += f.collected;

        dayPending += f.pending;

        const row = sheet.addRow([
            visit.name || "",
            (visit.services || [])
                .map((s) => (typeof s === "object" ? s.name : s))
                .join(", "),
            visit.payment_type || "Other",
            f.status,
            f.grossAmount,
            f.actualDiscount,
            f.netAmount,
            f.collected,
            f.pending,
            visit.invoiceNumber || "",
        ]);

        [5, 6, 7, 8, 9].forEach((c) => {
            row.getCell(c).numFmt = currencyFormat;
        });

        const statusColors = {
            Paid: "FF22C55E",
            Partial: "FFF59E0B",
            Unpaid: "FFEF4444",
        };

        row.getCell(4).font = {
            bold: true,
            color: {
                argb: statusColors[f.status] || "FFFFFFFF",
            },
        };

        if (index === sorted.length - 1) {
            const lastRow = sheet.addRow([
                "",
                "",
                "",
                "DAY TOTAL →",
                dayGross,
                dayDiscount,
                dayNet,
                dayCollected,
                dayPending,
            ]);

            lastRow.font = {
                bold: true,
            };

            [5, 6, 7, 8, 9].forEach((c) => {
                lastRow.getCell(c).numFmt = currencyFormat;
            });
        }
    });

    sheet.columns = [
        { width: 24 },
        { width: 40 },
        { width: 18 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 14 },
        { width: 18 },
    ];

    return await workbook.xlsx.writeBuffer();
};

module.exports = generateAppointmentExcel;
