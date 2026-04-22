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
} from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchPaymentMethods } from "../api/payment.api";
import EditAppointment from "./EditAppointment";
import EditPatient from "./EditPatient";
import "../css/Patientdetails.css";

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
                fetchData();
            } else {
                showAlert("Delete failed: " + data.message, "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Server error", "danger");
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Invoice generation
    // ─────────────────────────────────────────────────────────────────────────
    // ─── Drop-in replacement for PatientDetails.js ───────────────────────────────
    // Requires: currency prop { symbol: "₹", code: "INR" } passed from App.js
    // No new API needed — currency is already fetched via /api/doctor/get_currency
    // ─────────────────────────────────────────────────────────────────────────────

    // jsPDF's built-in Helvetica/Times fonts only support ASCII + Latin-1.
    // Unicode symbols like ₹ (U+20B9), ₩ (U+20A9) etc. render as garbage or are
    // dropped entirely. This map converts them to ASCII-safe equivalents FOR PDF
    // output only — the UI still shows the real symbol from currency.symbol.
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

    // Human-readable currency word used in receipt text
    // e.g. "Received with thanks... the sum of Rupees 20,000 only"
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

    // ─────────────────────────────────────────────────────────────────────────────

    const handleInvoiceClick = async (visit) => {
        try {
            const invoiceUsage = usage?.invoices;

            if (invoiceUsage?.isLimitReached) {
                showAlert("Invoice download limit reached", "warning");
                return;
            }

            if (invoiceUsage?.remaining === 1) {
                const confirmed = window.confirm(
                    "This is your LAST invoice download for this plan.\n\nDo you want to continue?",
                );
                if (!confirmed) return;
            }

            let includeDiscount = true;
            if (visit.discount && visit.discount > 0) {
                includeDiscount = window.confirm(
                    "This invoice has a discount.\n\nInclude it?",
                );
            }

            generateInvoicePDF(visit, includeDiscount);
        } catch (err) {
            console.error(err);
            showAlert("Failed to generate invoice", "danger");
        }
    };

    const generateInvoicePDF = (visit, includeDiscount) => {
        if (!doctor) {
            showAlert("Doctor details not loaded yet!", "warning");
            return;
        }

        try {
            // ── Currency resolution ──────────────────────────────────────────────
            // currency prop from App.js: { code: "INR", symbol: "₹" }
            // pdfSymbol: ASCII-safe for jsPDF (₹ can't render in built-in fonts)
            // currencyWord: used in receipt text ("Rupees twenty thousand only")
            const code = currency?.code || "INR";
            const pdfSymbol = PDF_SYMBOL_MAP[code] ?? currency?.symbol ?? code;
            const currencyWord = CURRENCY_WORD_MAP[code] ?? code;

            // ── PDF init ─────────────────────────────────────────────────────────
            const margin = 20;
            const docPdf = new jsPDF();
            const pageWidth = docPdf.internal.pageSize.getWidth();
            let leftY = 20;
            let rightY = 20;

            const invoiceNumber = visit.invoiceNumber || "N/A";

            // ── Left column: clinic + doctor info ────────────────────────────────
            docPdf.setFontSize(16);
            docPdf.setFont(undefined, "bold");
            docPdf.text(doctor.clinicName || "", margin, leftY);
            leftY += 10;

            docPdf.setFontSize(14);
            docPdf.setFont(undefined, "bold");
            docPdf.text(doctor.name || "", margin, leftY);
            leftY += 8;

            docPdf.setFontSize(11);
            docPdf.setFont(undefined, "normal");

            if (doctor.degree?.length) {
                docPdf.text(doctor.degree.join(", "), margin, leftY);
                leftY += 6;
            }

            if (doctor.regNumber) {
                docPdf.text(`Reg No: ${doctor.regNumber}`, margin, leftY);
                leftY += 6;
            }

            docPdf.setFont(undefined, "bold");
            docPdf.text(`Invoice No: INV-${invoiceNumber}`, margin, leftY);
            leftY += 8;

            docPdf.setFont(undefined, "normal");
            const patientLine = `Patient: ${details.name} | Age: ${details.age || "N/A"} | Gender: ${details.gender || "N/A"}`;
            docPdf.text(patientLine, margin, leftY);
            leftY += 6;

            // ── Right column: address + phone + date ─────────────────────────────
            docPdf.setFontSize(11);
            docPdf.setFont(undefined, "normal");

            if (doctor.address?.line1) {
                docPdf.text(doctor.address.line1, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }
            if (doctor.address?.line2) {
                docPdf.text(doctor.address.line2, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }
            if (doctor.address?.line3) {
                docPdf.text(doctor.address.line3, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }
            if (doctor.address?.city) {
                const cityLine = `${doctor.address.city}, ${doctor.address.state} - ${doctor.address.pincode}`;
                docPdf.text(cityLine, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }

            // phoneMasked is safe (backend masks it). phoneDecrypted only present
            // if the user clicked "reveal" in the UI — either way it's their own data.
            const docPhone =
                doctor.phoneDecrypted ||
                doctor.phoneMasked ||
                doctor.phone ||
                "";
            if (docPhone) {
                docPdf.text(`Phone: ${docPhone}`, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }

            docPdf.text(
                `Date: ${new Date(visit.date).toLocaleDateString("en-IN")}`,
                pageWidth - margin,
                rightY,
                { align: "right" },
            );

            // ── Billing calculations ─────────────────────────────────────────────
            const services = visit.service || [];
            const baseAmount = services.reduce(
                (sum, s) => sum + Number(s.amount || 0),
                0,
            );

            let discountValue = 0;
            let finalAmt = baseAmount;

            if (includeDiscount && visit.discount > 0) {
                discountValue = visit.isPercent
                    ? (baseAmount * visit.discount) / 100
                    : visit.discount;
                discountValue = Math.max(
                    0,
                    Math.min(discountValue, baseAmount),
                );
                finalAmt = baseAmount - discountValue;
            }

            const collectedAmount = Number(visit.collected ?? finalAmt);
            const remainingAmount = finalAmt - collectedAmount;
            const paymentStatus =
                remainingAmount <= 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // ── Table rows ───────────────────────────────────────────────────────
            const tableRows = services.map((s) => [
                s.name,
                `${pdfSymbol} ${fmt(s.amount)}`,
            ]);

            tableRows.push(["TOTAL AMOUNT", `${pdfSymbol} ${fmt(finalAmt)}`]);

            if (includeDiscount && visit.discount > 0) {
                const discountLabel = visit.isPercent
                    ? `Discount (${visit.discount}%)`
                    : `Discount (${pdfSymbol} ${visit.discount})`;
                tableRows.push([
                    discountLabel,
                    `- ${pdfSymbol} ${fmt(discountValue)}`,
                ]);
            }

            tableRows.push([
                "Collected",
                `${pdfSymbol} ${fmt(collectedAmount)}`,
            ]);

            if (remainingAmount !== 0) {
                tableRows.push([
                    "Payable Amount",
                    `${pdfSymbol} ${fmt(Math.abs(remainingAmount))}`,
                ]);
            }

            tableRows.push(["Status", paymentStatus]);

            // ── Render table ─────────────────────────────────────────────────────
            autoTable(docPdf, {
                startY: leftY + 4,
                head: [["Service", "Amount"]],
                body: tableRows,
                theme: "grid",
                styles: { fontSize: 11, cellPadding: 3 },
                headStyles: {
                    fillColor: [60, 60, 60],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                },
                columnStyles: {
                    0: { cellWidth: "auto" },
                    1: { cellWidth: 50, halign: "right" },
                },
                didParseCell: (data) => {
                    // Bold the summary rows at the bottom (everything after service rows)
                    if (data.row.index >= services.length) {
                        data.cell.styles.fontStyle = "bold";
                    }
                },
            });

            // ── Amount in words ──────────────────────────────────────────────────
            const roundedAmount = Math.round(finalAmt);
            let y = docPdf.lastAutoTable.finalY + 8;

            // toWords() throws on 0 — guard it
            const amountInWords =
                roundedAmount > 0
                    ? `${currencyWord} ${toWords(roundedAmount)} Only`
                    : `${currencyWord} Zero Only`;

            docPdf.setFontSize(11);
            docPdf.setFont(undefined, "bold");
            docPdf.text("Amount in Words:", margin, y);
            docPdf.setFont(undefined, "normal");
            docPdf.text(amountInWords, margin + 42, y);
            y += 10;

            // ── Receipt text ─────────────────────────────────────────────────────
            const receiptText =
                paymentStatus === "Paid"
                    ? `Received with thanks from ${details.name} the sum of ${currencyWord} ${fmt(collectedAmount)} only`
                    : paymentStatus === "Partial"
                      ? `Part payment of ${currencyWord} ${fmt(collectedAmount)} received from ${details.name}. Balance of ${currencyWord} ${fmt(remainingAmount)} is pending.`
                      : `Total amount of ${currencyWord} ${fmt(finalAmt)} is pending from ${details.name}.`;

            docPdf.setFontSize(11);
            docPdf.setFont(undefined, "normal");
            docPdf.text(receiptText, margin, y, {
                maxWidth: pageWidth - margin * 2,
            });
            y += 14;

            // ── Signature ────────────────────────────────────────────────────────
            docPdf.setFontSize(15);
            docPdf.setFont(undefined, "bold");
            docPdf.text(doctor.name, pageWidth - margin, y, { align: "right" });
            y += 6;

            docPdf.setFontSize(12);
            docPdf.setFont(undefined, "normal");
            docPdf.text("Signature", pageWidth - margin, y, { align: "right" });

            // ── Save ─────────────────────────────────────────────────────────────
            // Sanitise filename — patient name may have spaces or special chars
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
                                {details?.email || "N/A"}
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
                                {displayNumber} <Phone size={11} />
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
                            onClick={() => {
                                setEditPatientOpen(true);
                                // Fetch the full number so the edit form is
                                // pre-filled (fire-and-forget)
                                if (fullNumber === null) fetchFullNumber();
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
                    onClose={() => setEditPatientOpen(false)}
                    onSaved={() => {
                        setFullNumber(null);
                        fetchData();
                    }}
                />
            )}
        </>
    );
}
