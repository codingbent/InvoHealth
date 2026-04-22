import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useLocation } from "react-router-dom";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";
import PatientDetails from "./PatientDetails";
import EditService from "./EditService";
import {
    Plus,
    UserPlus,
    FileText,
    CalendarPlus,
    Pencil,
    X,
    ShieldCheck,
    BarChart3,
    CalendarDays,
    Folder,
    CreditCard,
    ChevronRight,
    User,
    Mail,
    Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import Pricing from "./Pricing";
import { API_BASE_URL } from "../components/config";
import "../css/Landingpage.css";

const FEATURES = [
    {
        name: "Patient Management",
        desc: "Easily manage patient profiles, history, and visit records in one place.",
        icon: <User size={18} />,
        color: "#a78bfa",
        bg: "rgba(167,139,250,0.1)",
        border: "rgba(167,139,250,0.3)",
        glow: "rgba(167,139,250,0.6)",
    },
    {
        name: "Appointment Scheduling",
        desc: "Smart scheduling with time slots, availability tracking, and quick booking.",
        icon: <CalendarDays size={18} />,
        color: "#38bdf8",
        bg: "rgba(56,189,248,0.1)",
        border: "rgba(56,189,248,0.3)",
        glow: "rgba(56,189,248,0.6)",
    },
    {
        name: "Patient Records",
        desc: "Upload and store prescriptions, X-rays, and medical reports with full visit history.",
        icon: <Folder size={18} />,
        color: "#60a5fa",
        bg: "rgba(96,165,250,0.1)",
        border: "rgba(96,165,250,0.3)",
        glow: "rgba(96,165,250,0.6)",
    },
    {
        name: "Gmail Notifications",
        desc: "Send invoices and appointment confirmations directly via Gmail API — no extra setup.",
        icon: <Mail size={18} />,
        color: "#fb923c",
        bg: "rgba(251,146,60,0.1)",
        border: "rgba(251,146,60,0.3)",
        glow: "rgba(251,146,60,0.6)",
    },
    {
        name: "Staff Management",
        desc: "Add receptionists, assistants and nurses with role-based access control.",
        icon: <User size={18} />,
        color: "#c084fc",
        bg: "rgba(192,132,252,0.1)",
        border: "rgba(192,132,252,0.3)",
        glow: "rgba(192,132,252,0.6)",
    },
    {
        name: "Smart Billing",
        desc: "Generate invoices instantly with automated calculations, discounts, and payment tracking.",
        icon: <FileText size={18} />,
        color: "#34d399",
        bg: "rgba(52,211,153,0.1)",
        border: "rgba(52,211,153,0.3)",
        glow: "rgba(52,211,153,0.6)",
    },
    {
        name: "Payment Tracking",
        desc: "Track paid, partial, and pending payments with clear financial insights.",
        icon: <CreditCard size={18} />,
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.1)",
        border: "rgba(245,158,11,0.3)",
        glow: "rgba(245,158,11,0.6)",
    },
    {
        name: "Medical Center Insights",
        desc: "Monitor revenue, patient flow, and performance with simple analytics.",
        icon: <BarChart3 size={18} />,
        color: "#f87171",
        bg: "rgba(248,113,113,0.1)",
        border: "rgba(248,113,113,0.3)",
        glow: "rgba(248,113,113,0.6)",
    },
];
const Patient = ({
    showAlert,
    currency,
    usage,
    // updateUsage,
    services,
    availability,
}) => {
    const [role, setRole] = useState(null);
    //eslint-disable-next-line
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showEditServiceModal, setShowEditServiceModal] = useState(false);
    // eslint-disable-next-line
    const [subscription, setSubscription] = useState(null);

    const Modal = ({ isOpen, onClose, children }) => {
        if (!isOpen) return null;
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div
                    className="modal-container"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* <button className="modal-close" onClick={onClose}>
                        ✕
                    </button> */}
                    {children}
                </div>
            </div>
        );
    };

    const location = useLocation();

    useEffect(() => {
        if (location.hash === "#pricing") {
            const el = document.getElementById("pricing");
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth" });
                }, 1000); // small delay for render
            }
        }
    }, [location]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setRole(decoded.user.role);
        } catch {
            setRole(null);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        fetch(`${API_BASE_URL}/api/doctor/subscription`, {
            headers: { "auth-token": token },
        })
            .then((res) => res.json())
            .then((data) => {
                if (!data.success) {
                    setSubscriptionStatus("expired");
                    return;
                }

                const sub = data.subscription;

                // compute real status (IMPORTANT)
                const now = new Date();
                const expiry = sub.expiryDate ? new Date(sub.expiryDate) : null;

                if (expiry && expiry <= now) {
                    setSubscriptionStatus("expired");
                } else {
                    setSubscriptionStatus(sub.status || "active");
                }
            })
            .catch(() => {
                setSubscriptionStatus(null); // allow fallback
            });
    }, []);

    const closeAppointment = () => {
        setShowAppointment(false);
        localStorage.removeItem("patient");
    };
    const openPatientDetails = (id) => {
        setSelectedPatientId(id);
        setShowPatientDetails(true);
    };
    const closePatientDetails = () => {
        setShowPatientDetails(false);
        setSelectedPatientId(null);
    };

    // useEffect(() => {
    //     if (!localStorage.getItem("token")) return;

    //     if (!subscriptionStatus) return;

    //     if (subscriptionStatus !== "active") {
    //         showAlert("Subscription expired. Please upgrade.", "danger");
    //     }
    // }, [subscriptionStatus, showAlert]);

    // ── Landing (not logged in) ──
    if (!localStorage.getItem("token")) {
        return (
            <>
                <motion.div
                    className="lp-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* Hero */}
                    <section className="lp-hero">
                        <div className="lp-badge">
                            <ShieldCheck size={11} /> FinTech for Healthcare
                        </div>
                        <h1 className="lp-h1">
                            Medical Center billing,
                            <br />
                            <em>simplified</em> for doctors
                        </h1>
                        <p className="lp-sub">
                            Manage patients, appointments, invoices and staff —
                            all in one place. Built for modern Medical center.
                        </p>
                        <div className="lp-hero-btns">
                            <a href="#pricing" className="lp-btn-hero">
                                Start Free Trial <ChevronRight size={13} />
                            </a>
                            <Link to="/login" className="lp-btn-ghost">
                                Log in
                            </Link>
                        </div>
                    </section>

                    <div className="lp-divider" />
                    {/* Trust strip */}
                    <div className="lp-trust-strip">
                        <span className="lp-trust-item">
                            <ShieldCheck size={13} /> Encrypted patient data
                        </span>
                        <span className="lp-trust-dot" />
                        <span className="lp-trust-item">
                            <Mail size={13} /> Gmail API notifications
                        </span>
                        <span className="lp-trust-dot" />
                        <span className="lp-trust-item">
                            <CreditCard size={13} /> Razorpay &amp;
                            international payments
                        </span>
                        <span className="lp-trust-dot" />
                        <span className="lp-trust-item">
                            <Globe size={13} /> Works worldwide
                        </span>
                    </div>
                    {/* Features */}
                    <section className="lp-features">
                        <div className="lp-section-eyebrow">What you get</div>
                        <h2 className="lp-section-title">
                            Everything a Maedical Center <em>needs</em>
                        </h2>
                        <div className="lp-feat-grid">
                            {FEATURES.map((f) => (
                                <div key={f.name} className="lp-feat-card">
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: "10%",
                                            right: "10%",
                                            height: 1,
                                            background: `linear-gradient(90deg, transparent, ${f.glow}, transparent)`,
                                        }}
                                    />
                                    <div
                                        className="lp-feat-icon"
                                        style={{
                                            background: f.bg,
                                            border: `1px solid ${f.border}`,
                                            color: f.color,
                                        }}
                                    >
                                        {f.icon}
                                    </div>
                                    <div className="lp-feat-name">{f.name}</div>
                                    <div className="lp-feat-desc">{f.desc}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* Pricing */}
                    <div id="pricing">
                        <Pricing />
                    </div>

                    {/* Trial banner */}
                </motion.div>
            </>
        );
    }

    // ── Logged in ──
    return (
        <>
            {!showAppointment && !showPatientDetails && (
                <>
                    {fabOpen && (
                        <div
                            className="fab-backdrop"
                            onClick={() => setFabOpen(false)}
                        />
                    )}

                    <div className={`fab-container ${fabOpen ? "open" : ""}`}>
                        <button
                            className={`fab-main ${fabOpen ? "open" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setFabOpen(!fabOpen);
                            }}
                        >
                            <Plus size={22} />
                        </button>

                        <button
                            className={`fab-item ${fabOpen ? "show" : ""}`}
                            style={{ "--i": 1 }}
                            onClick={() => {
                                if (
                                    subscriptionStatus !== null &&
                                    subscriptionStatus !== "active"
                                ) {
                                    showAlert(
                                        "Please upgrade your plan to continue.",
                                        "danger",
                                    );
                                    return;
                                }
                                setFabOpen(false);
                                setShowPatientModal(true);
                            }}
                        >
                            <UserPlus size={16} />
                            <span>Add Patient</span>
                        </button>

                        <button
                            className={`fab-item ${fabOpen ? "show" : ""}`}
                            style={{ "--i": 2 }}
                            onClick={() => {
                                if (
                                    subscriptionStatus !== null &&
                                    subscriptionStatus !== "active"
                                ) {
                                    showAlert(
                                        "Please upgrade your plan to continue.",
                                        "danger",
                                    );
                                    return;
                                }
                                setFabOpen(false);
                                setShowAppointment(true);
                            }}
                        >
                            <CalendarPlus size={16} />
                            <span>Add Appointment</span>
                        </button>

                        {role === "doctor" && (
                            <button
                                className={`fab-item ${fabOpen ? "show" : ""}`}
                                style={{ "--i": 3 }}
                                onClick={() => {
                                    if (
                                        subscriptionStatus !== null &&
                                        subscriptionStatus !== "active"
                                    ) {
                                        showAlert(
                                            "Please upgrade your plan to continue.",
                                            "danger",
                                        );
                                        return;
                                    }
                                    setFabOpen(false);
                                    setShowServiceModal(true);
                                }}
                            >
                                <FileText size={16} />
                                <span>Add Service</span>
                            </button>
                        )}

                        {role === "doctor" && (
                            <button
                                className={`fab-item ${fabOpen ? "show" : ""}`}
                                style={{ "--i": 4 }}
                                onClick={() => {
                                    if (
                                        subscriptionStatus !== null &&
                                        subscriptionStatus !== "active"
                                    ) {
                                        showAlert(
                                            "Please upgrade your plan to continue.",
                                            "danger",
                                        );
                                        return;
                                    }
                                    setFabOpen(false);
                                    setShowEditServiceModal(true);
                                }}
                            >
                                <Pencil size={16} />
                                <span>Edit Service</span>
                            </button>
                        )}
                    </div>
                </>
            )}

            <Modal
                isOpen={showPatientModal}
                onClose={() => setShowPatientModal(false)}
            >
                <AddPatient
                    showAlert={showAlert}
                    showModal={showPatientModal}
                    setShowModal={setShowPatientModal}
                    currency={currency}
                    usage={usage}
                    // updateUsage={updateUsage}
                    services={services}
                    availability={availability}
                />
            </Modal>
            <Modal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
            >
                <AddServices
                    showAlert={showAlert}
                    currency={currency}
                    onClose={() => setShowServiceModal(false)}
                />
            </Modal>
            <Modal
                isOpen={showEditServiceModal}
                onClose={() => setShowEditServiceModal(false)}
            >
                <EditService
                    showAlert={showAlert}
                    currency={currency}
                    onClose={() => setShowEditServiceModal(false)}
                />
            </Modal>

            <div className="app-page">
                {!showAppointment && !showPatientDetails && (
                    <PatientList
                        showAlert={showAlert}
                        currency={currency}
                        openPatientDetails={openPatientDetails}
                    />
                )}
                {showAppointment && (
                    <div className="app-section">
                        <AddAppointment
                            showAlert={showAlert}
                            currency={currency}
                            usage={usage}
                            // updateUsage={updateUsage}
                            services={services}
                            availability={availability}
                        />
                        <button
                            className="app-close-btn"
                            onClick={closeAppointment}
                        >
                            <X size={14} /> Close
                        </button>
                    </div>
                )}
                {showPatientDetails && selectedPatientId && (
                    <div className="app-section">
                        <PatientDetails
                            currency={currency}
                            patientId={selectedPatientId}
                            showAlert={showAlert}
                            services={services}
                            availability={availability}
                            onClose={closePatientDetails}
                        />
                    </div>
                )}
            </div>
        </>
    );
};

export default Patient;
