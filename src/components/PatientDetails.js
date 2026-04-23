import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { authFetch } from "./authfetch";
import { toWords } from "number-to-words";
import {
    Pencil,
    Trash2,
    Loader2,
    UserRound,
    User,
    Phone,
    ImageIcon,
    X,
    ChevronLeft,
    FileText,
    Eye,
    EyeOff,
    Mail,
} from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchPaymentMethods } from "../api/payment.api";
import EditAppointment from "./EditAppointment";
import EditPatient from "./EditPatient";
import "../css/Patientdetails.css";
import { fetchCountries } from "../api/country.api";

export default function PatientDetails({ showAlert, currency, usage }) {
    const navigate = useNavigate();
    const { id } = useParams();

    // ─── Patient / appointment data ───────────────────────────────────────────
    const [details, setDetails] = useState(null);
    const [appointmentId, setAppointmentId] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [doctor, setDoctor] = useState(null);

    // ─── UI state ─────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [recordView, setRecordView] = useState("history");
    const [lightboxImg, setLightboxImg] = useState(null);
    const [fullNumber, setFullNumber] = useState(null); // null = hidden, string = revealed

    // ─── Modal state ──────────────────────────────────────────────────────────
    const [editPatientOpen, setEditPatientOpen] = useState(false);
    const [editingVisit, setEditingVisit] = useState(null);
    const [invoiceDialog, setInvoiceDialog] = useState(null);
    // eslint-disable-next-line
    const [countries, setCountries] = useState([]);

    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/doctor/get_doc`);
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchServices = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/services/fetchall_services`,
            );
            const data = await res.json();
            setAvailableServices(
                Array.isArray(data) ? data : data.services || [],
            );
        } catch (err) {
            console.error(err);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, appointmentsRes] = await Promise.all([
                authFetch(
                    `${API_BASE_URL}/api/doctor/patient/patient_details/${id}`,
                ),
                authFetch(
                    `${API_BASE_URL}/api/doctor/patient/patient_record/${id}`,
                ),
            ]);
            const patientData = await patientRes.json();
            const appointmentsData = await appointmentsRes.json();
            setDetails(patientData);
            setAppointmentId(appointmentsData.appointmentId);
            setAppointments(appointmentsData.visits || []);
            await fetchServices();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id, fetchServices]);

    useEffect(() => {
        fetchData();
        fetchDoctor();
    }, [fetchData, fetchDoctor]);

    // Payment options (for rendering labels in the table)
    useEffect(() => {
        fetchPaymentMethods()
            .then(setPaymentOptions)
            .catch((err) => console.error("payment methods:", err));
    }, []);

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const data = await fetchCountries();
                setCountries(data || []);
            } catch (err) {
                console.error("Failed to load countries", err);
            }
        };
        loadCountries();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    const fmt = (v) =>
        new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
            v,
        );

    const formatTime = (time) => {
        if (!time) return "";
        const [h, m] = time.split(":");
        let hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    const statusClass = (s) =>
        s === "Paid" ? "pl-paid" : s === "Partial" ? "pl-partial" : "pl-unpaid";

    const getPaymentLabel = (visit) => {
        if (!visit?.paymentMethodId) return "N/A";
        const match = paymentOptions.find(
            (p) => String(p.id) === String(visit.paymentMethodId),
        );
        if (match)
            return match.subCategoryName
                ? match.subCategoryName
                : match.categoryName;
        return "Other";
    };

    const visitStatus = (visit) => {
        const col = Number(visit.collected ?? 0);
        const tot = Number(visit.amount ?? 0);
        const rem = tot - col;
        if (rem <= 0) return "Paid";
        if (col > 0) return "Partial";
        return "Unpaid";
    };

    const fetchFullNumber = async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/get_full_number/${id}`,
            );
            const data = await res.json();
            if (data.success) setFullNumber(data.number);
        } catch (err) {
            console.error(err);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Patient delete
    // ─────────────────────────────────────────────────────────────────────────

    const handleDeletePatient = async () => {
        if (
            !window.confirm(
                `Are you sure you want to delete "${details?.name}"?\nThis will remove all related appointments.`,
            )
        )
            return;
        try {
            setDeleting(true);
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/delete_patient/${id}`,
                { method: "DELETE" },
            );
            const data = await res.json();
            if (data.success) {
                showAlert("Patient deleted successfully", "success");
                navigate("/");
            } else {
                showAlert(data.message || "Failed to delete patient", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Server error", "danger");
        } finally {
            setDeleting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Appointment delete
    // ─────────────────────────────────────────────────────────────────────────

    const deleteVisit = async (visit) => {
        if (!window.confirm("Delete this appointment?")) return;

        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/delete_appointment/${appointmentId}/${visit._id}`,
                { method: "DELETE" },
            );

            const data = await res.json();

            if (data.success) {
                showAlert("Appointment deleted!", "success");

                setAppointments((prev) =>
                    prev.filter((v) => v._id !== visit._id),
                );

            } else {
                showAlert("Delete failed: " + data.message, "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Server error", "danger");
        }
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

    const handleInvoiceClick = (visit) => {
        const invoiceUsage = usage?.invoices;
        if (invoiceUsage?.isLimitReached) {
            showAlert("Invoice download limit reached", "warning");
            return;
        }

        if (visit.discount && visit.discount > 0) {
            // Ask about discount first — last-invoice warning handled after
            setInvoiceDialog({ visit, type: "discount" });
        } else if (invoiceUsage?.remaining === 1) {
            setInvoiceDialog({ visit, type: "last" });
        } else {
            generateInvoicePDF(visit, true);
        }
    };

    const handleDialogConfirm = (choice) => {
        if (!invoiceDialog) return;
        const { visit, type } = invoiceDialog;
        setInvoiceDialog(null);

        if (type === "discount") {
            const includeDiscount = choice; // true = Yes include, false = No hide
            const invoiceUsage = usage?.invoices;
            if (invoiceUsage?.remaining === 1) {
                // Chain the last-invoice warning after discount choice
                setInvoiceDialog({ visit, type: "last", includeDiscount });
            } else {
                generateInvoicePDF(visit, includeDiscount);
            }
        } else if (type === "last") {
            if (choice) {
                generateInvoicePDF(
                    visit,
                    invoiceDialog.includeDiscount ?? true,
                );
            }
        }
    };

    const generateInvoicePDF = (visit, includeDiscount) => {
        if (!doctor) {
            showAlert("Doctor details not loaded yet!", "warning");
            return;
        }

        try {
            const code = currency?.code || "INR";
            const pdfSymbol = PDF_SYMBOL_MAP[code] ?? currency?.symbol ?? code;
            const currencyWord = CURRENCY_WORD_MAP[code] ?? code;

            // ── PDF init ──────────────────────────────────────────────────────────
            const margin = 18;
            const docPdf = new jsPDF();
            const pageWidth = docPdf.internal.pageSize.getWidth();

            const invoiceNumber = visit.invoiceNumber || "N/A";

            // ── Helper: thin horizontal rule ──────────────────────────────────────
            const drawLine = (y, r = 180, g = 180, b = 180) => {
                docPdf.setDrawColor(r, g, b);
                docPdf.setLineWidth(0.3);
                docPdf.line(margin, y, pageWidth - margin, y);
            };

            // ─────────────────────────────────────────────────────────────────────
            // HEADER BLOCK — two columns, shared top baseline
            // ─────────────────────────────────────────────────────────────────────
            let leftY = 18;
            let rightY = 18;

            // Left: clinic name (prominent)
            docPdf.setFontSize(13);
            docPdf.setFont(undefined, "bold");
            docPdf.setTextColor(20, 20, 20);
            docPdf.text(doctor.clinicName || "", margin, leftY);
            leftY += 6;

            // Left: doctor name
            docPdf.setFontSize(10);
            docPdf.setFont(undefined, "bold");
            docPdf.setTextColor(40, 40, 40);
            docPdf.text(doctor.name || "", margin, leftY);
            leftY += 5;

            // Left: degree + reg (muted, small)
            docPdf.setFontSize(8.5);
            docPdf.setFont(undefined, "normal");
            docPdf.setTextColor(110, 110, 110);
            if (doctor.degree?.length) {
                docPdf.text(doctor.degree.join(", "), margin, leftY);
                leftY += 4.5;
            }
            if (doctor.regNumber) {
                docPdf.text(`Reg No: ${doctor.regNumber}`, margin, leftY);
                leftY += 4.5;
            }

            // Right: address lines (muted)
            docPdf.setFontSize(8.5);
            docPdf.setFont(undefined, "normal");
            docPdf.setTextColor(110, 110, 110);
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
            if (doctor.address?.city) {
                const cityLine = [
                    doctor.address.city,
                    doctor.address.state,
                    doctor.address.pincode,
                ]
                    .filter(Boolean)
                    .join(", ");
                docPdf.text(cityLine, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 4.5;
            }
            const docPhone = doctor.phone || doctor.phoneMasked || "";
            if (docPhone) {
                docPdf.text(`Ph: ${docPhone}`, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 4.5;
            }

            // ── Thick rule under header ───────────────────────────────────────────
            const afterHeader = Math.max(leftY, rightY) + 5;
            docPdf.setDrawColor(30, 30, 30);
            docPdf.setLineWidth(0.6);
            docPdf.line(margin, afterHeader, pageWidth - margin, afterHeader);

            // ─────────────────────────────────────────────────────────────────────
            // INVOICE META ROW — invoice no + date on same line
            // ─────────────────────────────────────────────────────────────────────
            let y = afterHeader + 7;

            docPdf.setFontSize(9);
            docPdf.setFont(undefined, "bold");
            docPdf.setTextColor(30, 30, 30);
            docPdf.text(`INVOICE  #INV-${invoiceNumber}`, margin, y);

            const dateStr = new Date(visit.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
            docPdf.setFont(undefined, "normal");
            docPdf.setTextColor(110, 110, 110);
            docPdf.text(`Date: ${dateStr}`, pageWidth - margin, y, {
                align: "right",
            });
            y += 5;

            // ── Patient line ──────────────────────────────────────────────────────
            docPdf.setFontSize(8.5);
            docPdf.setFont(undefined, "normal");
            docPdf.setTextColor(80, 80, 80);
            const parts = [`Patient: ${details.name}`];
            if (details.age) parts.push(`Age: ${details.age}`);
            if (details.gender) parts.push(`Gender: ${details.gender}`);
            docPdf.text(parts.join("   ·   "), margin, y);
            y += 3;

            // ── Thin rule under meta ──────────────────────────────────────────────
            drawLine(y + 3);
            y += 10;

            // ─────────────────────────────────────────────────────────────────────
            // BILLING CALCULATIONS
            // ─────────────────────────────────────────────────────────────────────
            const services = visit.service || [];
            const baseAmount = services.reduce(
                (sum, s) => sum + Number(s.amount || 0),
                0,
            );

            // Real discount — always applied regardless of includeDiscount flag
            const hasDiscount = visit.discount > 0;
            let discountValue = 0;
            let realFinalAmt = baseAmount;

            if (hasDiscount) {
                discountValue = visit.isPercent
                    ? (baseAmount * visit.discount) / 100
                    : visit.discount;
                discountValue = Math.max(
                    0,
                    Math.min(discountValue, baseAmount),
                );
                realFinalAmt = baseAmount - discountValue;
            }

            const displayAmt = includeDiscount ? realFinalAmt : baseAmount;

            const collectedAmount = Number(visit.collected ?? realFinalAmt);
            const remainingAmount = realFinalAmt - collectedAmount;
            const paymentStatus =
                remainingAmount <= 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // ─────────────────────────────────────────────────────────────────────
            // SERVICE TABLE ROWS
            // ─────────────────────────────────────────────────────────────────────
            const serviceRows = services.map((s) => [
                s.name,
                `${pdfSymbol} ${fmt(s.amount)}`,
            ]);

            // ─────────────────────────────────────────────────────────────────────
            // SUMMARY ROWS (separate so they can be styled differently)
            // ─────────────────────────────────────────────────────────────────────
            const summaryRows = [];

            if (includeDiscount && hasDiscount) {
                summaryRows.push([
                    "Subtotal",
                    `${pdfSymbol} ${fmt(baseAmount)}`,
                ]);
                const discountLabel = visit.isPercent
                    ? `Discount (${visit.discount}%)`
                    : `Discount (flat)`;
                summaryRows.push([
                    discountLabel,
                    `- ${pdfSymbol} ${fmt(discountValue)}`,
                ]);
            }

            summaryRows.push([
                "Total Payable",
                `${pdfSymbol} ${fmt(displayAmt)}`,
            ]);
            summaryRows.push([
                "Collected",
                `${pdfSymbol} ${fmt(includeDiscount ? collectedAmount : displayAmt)}`,
            ]);

            if (includeDiscount && Math.abs(remainingAmount) > 0) {
                summaryRows.push([
                    remainingAmount > 0 ? "Balance Due" : "Advance",
                    `${pdfSymbol} ${fmt(Math.abs(remainingAmount))}`,
                ]);
            }

            summaryRows.push(["Status", paymentStatus]);

            // ─────────────────────────────────────────────────────────────────────
            // RENDER TABLE
            // ─────────────────────────────────────────────────────────────────────
            autoTable(docPdf, {
                startY: y,
                head: [["Service", "Amount"]],
                body: [...serviceRows, ...summaryRows],
                theme: "plain",
                styles: {
                    fontSize: 9.5,
                    cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
                    textColor: [50, 50, 50],
                    lineColor: [220, 220, 220],
                    lineWidth: 0.2,
                },
                headStyles: {
                    fillColor: [30, 30, 30],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 9,
                    cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
                },
                columnStyles: {
                    0: { cellWidth: "auto" },
                    1: { cellWidth: 48, halign: "right" },
                },
                didParseCell: (data) => {
                    const isSummary = data.row.index >= serviceRows.length;
                    if (data.section === "body" && isSummary) {
                        // Summary rows: slightly muted background + bold
                        data.cell.styles.fillColor = [248, 248, 248];
                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.fontSize = 9;
                        data.cell.styles.textColor = [40, 40, 40];
                    }
                    // "Total Payable" row — accent it
                    const totalIdx =
                        serviceRows.length +
                        (includeDiscount && hasDiscount ? 2 : 0);
                    if (
                        data.section === "body" &&
                        data.row.index === totalIdx
                    ) {
                        data.cell.styles.fillColor = [30, 30, 30];
                        data.cell.styles.textColor = [255, 255, 255];
                        data.cell.styles.fontSize = 10;
                    }
                    // "Status" — last row
                    if (
                        data.section === "body" &&
                        data.row.index ===
                            serviceRows.length + summaryRows.length - 1
                    ) {
                        const isCol1 = data.column.index === 1;
                        if (isCol1) {
                            data.cell.styles.textColor =
                                paymentStatus === "Paid"
                                    ? [22, 101, 52]
                                    : paymentStatus === "Partial"
                                      ? [154, 52, 18]
                                      : [153, 27, 27];
                        }
                    }
                },
            });

            // ─────────────────────────────────────────────────────────────────────
            // AMOUNT IN WORDS + RECEIPT TEXT
            // ─────────────────────────────────────────────────────────────────────
            y = docPdf.lastAutoTable.finalY + 9;
            drawLine(y - 3);

            const roundedAmount = Math.round(
                includeDiscount ? realFinalAmt : displayAmt,
            );

            const displayCollected = includeDiscount
                ? collectedAmount
                : displayAmt;

            const receiptText =
                paymentStatus === "Paid"
                    ? `Received with thanks from ${details.name} the sum of ${pdfSymbol} ${fmt(displayCollected)} only.`
                    : paymentStatus === "Partial"
                      ? `Part payment of ${pdfSymbol} ${fmt(displayCollected)} received from ${details.name}. Balance of ${pdfSymbol} ${fmt(remainingAmount)} is pending.`
                      : `Total amount of ${pdfSymbol} ${fmt(displayAmt)} is pending from ${details.name}.`;

            const amountInWords =
                roundedAmount > 0
                    ? `${currencyWord} ${toWords(roundedAmount)} Only`
                    : `${currencyWord} Zero Only`;

            // Capitalise first letter
            const amountInWordsCapped =
                amountInWords.charAt(0).toUpperCase() + amountInWords.slice(1);

            docPdf.setFontSize(8.5);
            docPdf.setTextColor(90, 90, 90);
            docPdf.setFont(undefined, "bold");
            docPdf.text("In Words:", margin, y);
            docPdf.setFont(undefined, "normal");
            docPdf.text(amountInWordsCapped, margin + 22, y, {
                maxWidth: pageWidth - margin * 2 - 22,
            });
            y += 7;

            docPdf.setFontSize(8.5);
            docPdf.setFont(undefined, "italic");
            docPdf.setTextColor(100, 100, 100);
            docPdf.text(receiptText, margin, y, {
                maxWidth: pageWidth - margin * 2,
            });
            y += 14;

            // ─────────────────────────────────────────────────────────────────────
            // SIGNATURE BLOCK
            // ─────────────────────────────────────────────────────────────────────
            drawLine(y - 4);

            // Signature line (right side)
            docPdf.setDrawColor(120, 120, 120);
            docPdf.setLineWidth(0.3);
            const sigLineEnd = pageWidth - margin;
            const sigLineStart = sigLineEnd - 55;
            docPdf.line(sigLineStart, y, sigLineEnd, y);
            y += 4;

            docPdf.setFontSize(9);
            docPdf.setFont(undefined, "bold");
            docPdf.setTextColor(30, 30, 30);
            docPdf.text(doctor.name || "", pageWidth - margin, y, {
                align: "right",
            });
            y += 4.5;

            docPdf.setFontSize(8);
            docPdf.setFont(undefined, "normal");
            docPdf.setTextColor(120, 120, 120);
            docPdf.text("Authorised Signatory", pageWidth - margin, y, {
                align: "right",
            });

            // ─────────────────────────────────────────────────────────────────────
            // SAVE
            // ─────────────────────────────────────────────────────────────────────
            const safeName = (details.name || "patient")
                .replace(/[^a-zA-Z0-9\s]/g, "")
                .trim()
                .replace(/\s+/g, "_");

            docPdf.save(`Invoice_${safeName}_INV${invoiceNumber}.pdf`);
        } catch (err) {
            console.error(err);
            showAlert("Failed to generate invoice", "danger");
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Derived / memoised values
    // ─────────────────────────────────────────────────────────────────────────

    const displayNumber =
        fullNumber ||
        details?.numberMasked ||
        `******${details?.numberLast4 || ""}`;

    const sortedAppointments = useMemo(
        () =>
            [...appointments].sort(
                (a, b) =>
                    new Date(`${b.date}T${b.time || "00:00"}`) -
                    new Date(`${a.date}T${a.time || "00:00"}`),
            ),
        [appointments],
    );

    const appointmentsForView = useMemo(
        () =>
            sortedAppointments.map((v) => ({
                ...v,
                formattedDate: new Date(v.date).toLocaleDateString("en-IN"),
            })),
        [sortedAppointments],
    );

    const patientImages = useMemo(
        () =>
            appointments
                .filter((v) => v.image && v.image !== "")
                .map((v) => ({
                    url: v.image,
                    date: new Date(v.date).toLocaleDateString("en-IN"),
                })),
        [appointments],
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    if (loading)
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 0",
                    gap: 12,
                }}
            >
                <div style={{ display: "flex", gap: 8 }}>
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#2e3d5c",
                                animation: `pd-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                display: "inline-block",
                            }}
                        />
                    ))}
                </div>
                <span
                    style={{
                        fontSize: 11,
                        color: "#2e3d5c",
                        letterSpacing: "0.08em",
                    }}
                >
                    Loading patient details…
                </span>
                <style>{`@keyframes pd-pulse{0%,80%,100%{transform:scale(1);opacity:.4}40%{transform:scale(1.4);opacity:1}}`}</style>
            </div>
        );

    return (
        <>
            <div className="pd-root">
                <button className="pd-back" onClick={() => navigate("/")}>
                    <ChevronLeft size={14} /> Back
                </button>

                {/* ── Patient card ── */}
                <div className="pd-card">
                    <div className="pd-patient-header">
                        <div className="pd-patient-left">
                            <div className="pd-avatar">
                                {details?.gender === "Female" ? (
                                    <UserRound size={20} />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                            <div className="pd-patient-name">
                                {details?.name}
                            </div>
                        </div>
                    </div>

                    <div className="pd-info-grid">
                        <div className="pd-info-item">
                            <div className="pd-info-label">Age</div>
                            <div className="pd-info-value">
                                {details?.age || "N/A"}
                            </div>
                        </div>
                        <div className="pd-info-item">
                            <div className="pd-info-label">Gender</div>
                            <div className="pd-info-value">
                                {details?.gender || "N/A"}
                            </div>
                        </div>
                        <div className="pd-info-item">
                            <div className="pd-info-label">E-Mail</div>
                            <div className="pd-info-value">
                                {details?.email ? (
                                    <a
                                        href={`mailto:${details.email}`}
                                        style={{
                                            color: "#60a5fa",
                                            textDecoration: "none",
                                        }}
                                    >
                                        <Mail size={16} /> {details.email}
                                    </a>
                                ) : (
                                    "N/A"
                                )}
                            </div>
                        </div>
                        <div className="pd-info-item">
                            <div className="pd-info-label">Contact</div>
                            <a
                                href={fullNumber ? `tel:${fullNumber}` : "#"}
                                style={{
                                    color: "#60a5fa",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontSize: 12,
                                }}
                            >
                                {details.dialCode} {displayNumber}{" "}
                                <Phone size={11} />
                            </a>
                            {fullNumber === null ? (
                                <button
                                    onClick={fetchFullNumber}
                                    style={{
                                        fontSize: 10,
                                        marginLeft: 6,
                                        color: "#4d7cf6",
                                        cursor: "pointer",
                                        border: "none",
                                        background: "none",
                                    }}
                                >
                                    <Eye size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setFullNumber(null)}
                                    style={{
                                        fontSize: 10,
                                        marginLeft: 6,
                                        color: "#ef4444",
                                        cursor: "pointer",
                                        border: "none",
                                        background: "none",
                                    }}
                                >
                                    <EyeOff size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="pd-actions">
                        <button
                            className="pd-btn pd-btn-primary"
                            onClick={async () => {
                                if (fullNumber === null) {
                                    await fetchFullNumber();
                                }
                                setEditPatientOpen(true);
                            }}
                        >
                            <Pencil size={13} /> Edit Patient
                        </button>
                        <button
                            className="pd-btn pd-btn-danger"
                            disabled={deleting}
                            onClick={handleDeletePatient}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 size={13} className="spin" />{" "}
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 size={13} /> Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── History / images card ── */}
                <div className="pd-card">
                    <div className="pd-switch">
                        <button
                            className={`pd-switch-btn${recordView === "history" ? " active" : ""}`}
                            onClick={() => setRecordView("history")}
                        >
                            Appointment History
                        </button>
                        <button
                            className={`pd-switch-btn${recordView === "images" ? " active" : ""}`}
                            onClick={() => setRecordView("images")}
                        >
                            Patient Records
                        </button>
                    </div>

                    {/* ── History view ── */}
                    {recordView === "history" ? (
                        appointmentsForView.length === 0 ? (
                            <div className="pd-gallery-empty">
                                No appointment history
                            </div>
                        ) : (
                            <>
                                {/* Desktop table */}
                                <table className="pd-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Services</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th className="right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointmentsForView.map((visit) => {
                                            const status = visitStatus(visit);
                                            return (
                                                <tr key={visit._id}>
                                                    <td>
                                                        {visit.formattedDate}
                                                    </td>
                                                    <td>
                                                        {(visit.service || [])
                                                            .map((s) => s.name)
                                                            .join(", ")}
                                                    </td>
                                                    <td>
                                                        {currency?.symbol}{" "}
                                                        {fmt(visit.amount ?? 0)}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`pl-status ${statusClass(status)}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {getPaymentLabel(visit)}
                                                    </td>
                                                    <td className="right">
                                                        <div className="pd-action-btns">
                                                            <button
                                                                className="pd-icon-btn pd-icon-inv"
                                                                onClick={() =>
                                                                    handleInvoiceClick(
                                                                        visit,
                                                                    )
                                                                }
                                                            >
                                                                <FileText
                                                                    size={13}
                                                                />
                                                            </button>
                                                            <button
                                                                className="pd-icon-btn pd-icon-edit"
                                                                onClick={() =>
                                                                    setEditingVisit(
                                                                        {
                                                                            appointmentId,
                                                                            visit,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <Pencil
                                                                    size={13}
                                                                />
                                                            </button>
                                                            <button
                                                                className="pd-icon-btn pd-icon-del danger"
                                                                onClick={() =>
                                                                    deleteVisit(
                                                                        visit,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2
                                                                    size={13}
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Mobile cards */}
                                <div className="pd-mob-table">
                                    {appointmentsForView.map((visit) => {
                                        const col = Number(
                                            visit.collected ?? 0,
                                        );
                                        const tot = Number(visit.amount ?? 0);
                                        const rem = tot - col;
                                        const s =
                                            rem <= 0
                                                ? "Paid"
                                                : col > 0
                                                  ? "Partial"
                                                  : "Unpaid";
                                        return (
                                            <div
                                                key={visit._id}
                                                className="pd-visit-card"
                                            >
                                                <div className="pd-visit-row">
                                                    <div>
                                                        <div className="pd-visit-date">
                                                            {
                                                                visit.formattedDate
                                                            }
                                                        </div>
                                                        {visit.time && (
                                                            <div className="pd-visit-time">
                                                                {formatTime(
                                                                    visit.time,
                                                                )}
                                                            </div>
                                                        )}
                                                        <div
                                                            style={{
                                                                fontSize: 11,
                                                                color: "#6b7fa8",
                                                                marginTop: 4,
                                                            }}
                                                        >
                                                            {(
                                                                visit.service ||
                                                                []
                                                            )
                                                                .map(
                                                                    (s) =>
                                                                        s.name,
                                                                )
                                                                .join(", ")}
                                                        </div>
                                                    </div>
                                                    <div
                                                        style={{
                                                            textAlign: "right",
                                                        }}
                                                    >
                                                        <div className="pd-visit-amount">
                                                            {currency?.symbol}
                                                            {fmt(
                                                                visit.amount ??
                                                                    0,
                                                            )}
                                                        </div>
                                                        {col < tot && (
                                                            <div className="pd-visit-sub">
                                                                Collected{" "}
                                                                {
                                                                    currency?.symbol
                                                                }
                                                                {fmt(
                                                                    visit.collected ||
                                                                        0,
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="pd-visit-footer">
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: 6,
                                                            flexWrap: "wrap",
                                                            alignItems:
                                                                "center",
                                                        }}
                                                    >
                                                        <span
                                                            className={`pl-tag pl-${(visit.categoryName || "other").toLowerCase()}`}
                                                        >
                                                            {getPaymentLabel(
                                                                visit,
                                                            )}
                                                        </span>
                                                        <span
                                                            className={`pl-status ${statusClass(s)}`}
                                                        >
                                                            {s}
                                                        </span>
                                                    </div>
                                                    <div className="pd-visit-actions">
                                                        <button
                                                            className="pd-icon-btn pd-icon-inv"
                                                            onClick={() =>
                                                                handleInvoiceClick(
                                                                    visit,
                                                                )
                                                            }
                                                        >
                                                            <FileText
                                                                size={13}
                                                            />
                                                        </button>
                                                        <button
                                                            className="pd-icon-btn pd-icon-edit"
                                                            onClick={() =>
                                                                setEditingVisit(
                                                                    {
                                                                        appointmentId,
                                                                        visit,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button
                                                            className="pd-icon-btn pd-icon-del"
                                                            onClick={() =>
                                                                deleteVisit(
                                                                    visit,
                                                                )
                                                            }
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )
                    ) : (
                        /* ── Image view ── */
                        <>
                            {patientImages.length === 0 ? (
                                <div className="pd-gallery-empty">
                                    <ImageIcon
                                        size={14}
                                        style={{ opacity: 0.3 }}
                                    />
                                    No records available
                                </div>
                            ) : (
                                <div className="pd-image-grid">
                                    {patientImages.map((img, i) => (
                                        <div
                                            key={i}
                                            className="pd-image-item"
                                            onClick={() => setLightboxImg(img)}
                                        >
                                            <img src={img.url} alt="record" />
                                            <div className="pd-image-overlay">
                                                {img.date}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Lightbox ── */}
            {lightboxImg && (
                <div
                    className="pd-lightbox-bg"
                    onClick={() => setLightboxImg(null)}
                >
                    <button
                        className="pd-lightbox-close"
                        onClick={() => setLightboxImg(null)}
                    >
                        <X size={15} />
                    </button>
                    <img
                        className="pd-lightbox-img"
                        src={lightboxImg.url}
                        alt="patient record"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="pd-lightbox-date">{lightboxImg.date}</div>
                </div>
            )}

            {/* ── Edit Appointment modal ── */}
            {editingVisit && (
                <EditAppointment
                    showAlert={showAlert}
                    currency={currency}
                    appointmentId={editingVisit.appointmentId}
                    visit={editingVisit.visit}
                    availableServices={availableServices}
                    onClose={() => setEditingVisit(null)}
                    onSaved={fetchData}
                />
            )}

            {/* ── Edit Patient modal ── */}
            {editPatientOpen && (
                <EditPatient
                    patientId={id}
                    details={details}
                    fullNumber={fullNumber}
                    showAlert={showAlert}
                    onClose={() => {
                        setFullNumber(null);
                        setEditPatientOpen(false);
                    }}
                    onSaved={() => {
                        setFullNumber(null);
                        fetchData();
                    }}
                />
            )}
            {/* ── Invoice confirm dialog ── */}
            {invoiceDialog && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.55)",
                        zIndex: 1000,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    onClick={() => setInvoiceDialog(null)}
                >
                    <div
                        style={{
                            background: "var(--color-background-primary)",
                            border: "0.5px solid var(--color-border-secondary)",
                            borderRadius: "var(--border-radius-lg)",
                            padding: "24px 28px",
                            maxWidth: 360,
                            width: "90%",
                            boxSizing: "border-box",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            style={{
                                fontSize: 14,
                                fontWeight: 500,
                                marginBottom: 8,
                                color: "var(--color-text-primary)",
                            }}
                        >
                            {invoiceDialog.type === "discount"
                                ? "Discount on invoice"
                                : "Last invoice remaining"}
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                color: "var(--color-text-secondary)",
                                lineHeight: 1.6,
                                marginBottom: 20,
                            }}
                        >
                            {invoiceDialog.type === "discount"
                                ? "This appointment has a discount applied. Include it on the invoice?"
                                : "This is your last invoice download for the current plan. Continue?"}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                justifyContent: "flex-end",
                            }}
                        >
                            <button
                                style={{
                                    padding: "7px 18px",
                                    fontSize: 13,
                                    border: "0.5px solid var(--color-border-secondary)",
                                    borderRadius: "var(--border-radius-md)",
                                    background: "none",
                                    color: "var(--color-text-secondary)",
                                    cursor: "pointer",
                                }}
                                onClick={() => {
                                    invoiceDialog.type === "last"
                                        ? setInvoiceDialog(null)
                                        : handleDialogConfirm(false);
                                }}
                            >
                                {invoiceDialog.type === "discount"
                                    ? "No, hide it"
                                    : "Cancel"}
                            </button>
                            <button
                                style={{
                                    padding: "7px 18px",
                                    fontSize: 13,
                                    border: "none",
                                    borderRadius: "var(--border-radius-md)",
                                    background: "var(--color-text-primary)",
                                    color: "var(--color-background-primary)",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                }}
                                onClick={() => handleDialogConfirm(true)}
                            >
                                {invoiceDialog.type === "discount"
                                    ? "Yes, include"
                                    : "Download"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
