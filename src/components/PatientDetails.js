import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";
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
    Plus,
} from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchPaymentMethods } from "../api/payment.api";
import EditAppointment from "./EditAppointment";
import EditPatient from "./EditPatient";
import AddAppointment from "./AddAppointment";
import "../css/Patientdetails.css";
import { fetchCountries } from "../api/country.api";
import generateInvoicePDF from "./utils/generateInvoice";
import { fetchServices } from "../api/service.api";

export default function PatientDetails({
    showAlert,
    currency,
    usage,
    categoryName,
    subCategoryName,
    country,
}) {
    const navigate = useNavigate();
    const { id } = useParams();

    // ─── Patient / appointment data ────────────────────────────────────────────
    const [details, setDetails] = useState(null);
    const [appointmentId, setAppointmentId] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [doctor, setDoctor] = useState(null);
    const [addAppointmentOpen, setAddAppointmentOpen] = useState(false);

    // ─── UI state ──────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);
    const [recordView, setRecordView] = useState("history");
    const [lightboxImg, setLightboxImg] = useState(null);
    const [fullNumber, setFullNumber] = useState(null);

    // ─── Modal state ───────────────────────────────────────────────────────────
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
            const servicesData = await fetchServices();
            setAvailableServices(servicesData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
        fetchDoctor();
    }, [fetchData, fetchDoctor]);

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

    const locale = country?.code ? `en-${country.code}` : undefined;

    const fmt = (v) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v);

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
                `Remove "${details?.name}" from your patients?\n\nThis will delete only your records and appointments.`,
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
                showAlert("Patient removed successfully", "success");
                navigate("/");
            } else
                showAlert(data.message || "Failed to delete patient", "danger");
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

    const handleInvoiceClick = (visit) => {
        const invoiceUsage = usage?.invoices;
        if (invoiceUsage?.isLimitReached) {
            showAlert("Invoice download limit reached", "warning");
            return;
        }
        if (visit.discount && visit.discount > 0) {
            setInvoiceDialog({ visit, type: "discount" });
        } else if (invoiceUsage?.remaining === 1) {
            setInvoiceDialog({ visit, type: "last" });
        } else {
            generateInvoicePDF(visit, true, doctor, details, showAlert);
        }
    };

    const handleDialogConfirm = (choice) => {
        if (!invoiceDialog) return;
        const { visit, type } = invoiceDialog;
        setInvoiceDialog(null);
        if (type === "discount") {
            const includeDiscount = choice;
            const invoiceUsage = usage?.invoices;
            if (invoiceUsage?.remaining === 1) {
                setInvoiceDialog({ visit, type: "last", includeDiscount });
            } else {
                generateInvoicePDF(
                    visit,
                    includeDiscount,
                    doctor,
                    details,
                    showAlert,
                );
            }
        } else if (type === "last") {
            if (choice)
                generateInvoicePDF(
                    visit,
                    invoiceDialog.includeDiscount ?? true,
                    doctor,
                    details,
                    showAlert,
                );
        }
    };

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

    // PatientDetails.js — line ~291
    const appointmentsForView = useMemo(
        () =>
            sortedAppointments.map((v) => ({
                ...v,
                formattedDate: new Date(v.date).toLocaleDateString(locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                }),
            })),
        [sortedAppointments, locale],
    );

    const downloadFile = async (url, filename) => {
        const token = localStorage.getItem("patient_token");
        try {
            const res = await fetch(url, {
                headers: {
                    "auth-token": token,
                },
            });
            const blob = await res.blob();

            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Download failed:", err);
            window.open(url, "_blank");
        }
    };

    const formatDate = (date) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const patientImages = useMemo(() => {
        return appointments.flatMap((visit) => {
            const arr =
                Array.isArray(visit.images) && visit.images.length > 0
                    ? visit.images
                    : visit.image
                      ? [{ url: visit.image, type: "image" }]
                      : [];

            return arr.map((img) => ({
                url: img.url || img,
                type: img.type || "image",
                date: visit.date, // keep raw date
            }));
        });
    }, [appointments]);

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

                {/* Patient card */}
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
                                {details?.age ?? "N/A"}
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
                                {details?.dialCode} {displayNumber}{" "}
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
                                if (fullNumber === null)
                                    await fetchFullNumber();
                                setEditPatientOpen(true);
                            }}
                        >
                            <Pencil size={13} /> Edit Patient
                        </button>

                        <button
                            className="pd-btn pd-btn-add-appt"
                            onClick={() => setAddAppointmentOpen(true)}
                        >
                            <Plus size={13} /> Add Appointment
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

                {/* History / images card */}
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
                            Patient Records{" "}
                            {patientImages.length > 0 && (
                                <span
                                    style={{
                                        marginLeft: 4,
                                        fontSize: 10,
                                        color: "#60a5fa",
                                    }}
                                >
                                    ({patientImages.length})
                                </span>
                            )}
                        </button>
                    </div>

                    {/* History view */}
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
                                                        {Number(
                                                            visit.remaining,
                                                        ) <= 0 ? (
                                                            <div className="pd-visit-amount">
                                                                {
                                                                    currency?.symbol
                                                                }
                                                                {fmt(
                                                                    visit.collected ??
                                                                        0,
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="pd-visit-amount">
                                                                {
                                                                    currency?.symbol
                                                                }
                                                                {fmt(
                                                                    visit.collected ??
                                                                        0,
                                                                )}
                                                                <span className="pd-amount-separator">
                                                                    of
                                                                </span>
                                                                {
                                                                    currency?.symbol
                                                                }
                                                                {fmt(
                                                                    Number(
                                                                        visit.collected ??
                                                                            0,
                                                                    ) +
                                                                        Number(
                                                                            visit.remaining ??
                                                                                0,
                                                                        ),
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`pl-status ${statusClass(visit.status)}`}
                                                        >
                                                            {visit.status}
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
                                        const s = visit.status;
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
                                                        {Number(
                                                            visit.remaining,
                                                        ) <= 0 ? (
                                                            <div className="pd-visit-amount">
                                                                {
                                                                    currency?.symbol
                                                                }
                                                                {fmt(
                                                                    visit.collected ??
                                                                        0,
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="pd-visit-amount">
                                                                {
                                                                    currency?.symbol
                                                                }
                                                                {fmt(
                                                                    visit.collected ??
                                                                        0,
                                                                )}
                                                                <span className="pd-amount-separator">
                                                                    of
                                                                </span>
                                                                {
                                                                    currency?.symbol
                                                                }
                                                                {fmt(
                                                                    Number(
                                                                        visit.collected ??
                                                                            0,
                                                                    ) +
                                                                        Number(
                                                                            visit.remaining ??
                                                                                0,
                                                                        ),
                                                                )}
                                                            </div>
                                                        )}

                                                        <span
                                                            className={`pl-status ${statusClass(s)}`}
                                                            style={{
                                                                marginTop:
                                                                    "10px",
                                                            }}
                                                        >
                                                            {s}
                                                        </span>
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
                        <>
                            {patientImages.length === 0 ? (
                                <div className="pd-gallery-empty">
                                    <ImageIcon
                                        size={14}
                                        style={{ opacity: 0.3 }}
                                    />{" "}
                                    No records available
                                </div>
                            ) : (
                                <div className="pd-image-grid">
                                    {patientImages.map((img, idx) => {
                                        const isPDF =
                                            img?.type === "application/pdf" ||
                                            img?.url?.includes("/raw/upload") ||
                                            img?.url
                                                ?.toLowerCase()
                                                .endsWith(".pdf");

                                        const displayDate = formatDate(
                                            img.date,
                                        );

                                        return (
                                            <div
                                                key={idx}
                                                className="pd-image-card"
                                                onClick={() => {
                                                    if (isPDF) {
                                                        downloadFile(
                                                            img.url,
                                                            `${details.name}.pdf`,
                                                        );
                                                    } else {
                                                        setLightboxImg({
                                                            url: img.url,
                                                            type:
                                                                img.type ||
                                                                "image",
                                                            idx: idx,
                                                            date: formatDate(
                                                                img.date,
                                                            ),
                                                            allImgs:
                                                                patientImages.filter(
                                                                    (i) => {
                                                                        const isPDFCheck =
                                                                            i?.type ===
                                                                                "application/pdf" ||
                                                                            i?.url?.includes(
                                                                                "/raw/upload",
                                                                            ) ||
                                                                            i?.url
                                                                                ?.toLowerCase()
                                                                                .endsWith(
                                                                                    ".pdf",
                                                                                );
                                                                        return !isPDFCheck; // only images
                                                                    },
                                                                ),
                                                        });
                                                    }
                                                }}
                                            >
                                                {isPDF ? (
                                                    <div className="pd-pdf-content">
                                                        📄
                                                        <span className="pd-file-label">
                                                            PDF
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <img src={img.url} alt="" />
                                                )}

                                                <div className="pd-image-date">
                                                    {displayDate}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {lightboxImg &&
                (() => {
                    const { allImgs, idx } = lightboxImg;
                    const hasPrev = allImgs && idx > 0;
                    const hasNext = allImgs && idx < allImgs.length - 1;
                    return (
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
                            {hasPrev && (
                                <button
                                    className="pd-lightbox-nav pd-lightbox-nav--prev"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImg((p) => ({
                                            ...p,
                                            url:
                                                allImgs[idx - 1].url ||
                                                allImgs[idx - 1],
                                            type:
                                                allImgs[idx - 1].type ||
                                                "image",
                                            idx: idx - 1,
                                        }));
                                    }}
                                >
                                    ‹
                                </button>
                            )}
                            {lightboxImg.type === "application/pdf" ? (
                                <div
                                    style={{
                                        color: "white",
                                        textAlign: "center",
                                    }}
                                >
                                    <p>PDF file</p>
                                    <button
                                        onClick={() =>
                                            downloadFile(lightboxImg.url)
                                        }
                                        style={{
                                            padding: "8px 14px",
                                            background: "#2563eb",
                                            border: "none",
                                            borderRadius: 6,
                                            color: "white",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Download PDF
                                    </button>
                                </div>
                            ) : (
                                <img
                                    className="pd-lightbox-img"
                                    src={lightboxImg.url}
                                    alt="patient record"
                                />
                            )}
                            {hasNext && (
                                <button
                                    className="pd-lightbox-nav pd-lightbox-nav--next"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxImg((p) => ({
                                            ...p,
                                            url:
                                                allImgs[idx + 1].url ||
                                                allImgs[idx + 1],
                                            type:
                                                allImgs[idx + 1].type ||
                                                "image",
                                            idx: idx + 1,
                                        }));
                                    }}
                                >
                                    ›
                                </button>
                            )}
                            <div className="pd-lightbox-date">
                                {lightboxImg.date}
                                {allImgs &&
                                    allImgs.length > 1 &&
                                    ` · ${idx + 1}/${allImgs.length}`}
                            </div>
                        </div>
                    );
                })()}

            {/* Edit Appointment modal */}
            {editingVisit && (
                <EditAppointment
                    showAlert={showAlert}
                    currency={currency}
                    usage={usage}
                    appointmentId={editingVisit.appointmentId}
                    visit={editingVisit.visit}
                    availableServices={availableServices}
                    onClose={() => setEditingVisit(null)}
                    onSaved={fetchData}
                />
            )}

            {/* Edit Patient modal */}
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

            {/* Invoice confirm dialog */}
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
                        backdropFilter: "blur(10px)",
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
            {/* Add Appointment modal */}
            {addAppointmentOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        zIndex: 900,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "center",
                        overflowY: "auto",
                        padding: "40px 16px 60px",
                        backdropFilter: "blur(6px)",
                    }}
                    onClick={() => setAddAppointmentOpen(false)}
                >
                    <div
                        className="pd-add-appt-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            className="pd-add-appt-close"
                            onClick={() => setAddAppointmentOpen(false)}
                        >
                            <X size={15} />
                        </button>

                        <AddAppointment
                            showAlert={showAlert}
                            currency={currency}
                            usage={usage}
                            country={country}
                            preselectedPatient={{
                                _id: id,
                                name: details?.name,
                                number: fullNumber || details?.numberLast4,
                            }}
                            onAppointmentAdded={() => {
                                fetchData();
                                setAddAppointmentOpen(false);
                            }}
                            closePanel={() => setAddAppointmentOpen(false)}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
