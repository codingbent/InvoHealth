import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
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
    BarChart2,
    FileSpreadsheet,
    Clock,
    ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import Pricing from "./Pricing";

const FEATURES = [
    {
        icon: <UserPlus size={17} />,
        color: "#2dd4bf",
        bg: "rgba(45,212,191,0.1)",
        border: "rgba(45,212,191,0.18)",
        glow: "rgba(45,212,191,0.25)",
        name: "Patient Management",
        desc: "Add patients, track visits, store contact details and full appointment history in one view.",
    },
    {
        icon: <FileSpreadsheet size={17} />,
        color: "#60a5fa",
        bg: "rgba(96,165,250,0.1)",
        border: "rgba(96,165,250,0.18)",
        glow: "rgba(96,165,250,0.25)",
        name: "Smart Invoicing",
        desc: "Generate PDF invoices instantly with automatic billing, discounts and payment status tracking.",
    },
    {
        icon: <Clock size={17} />,
        color: "#a78bfa",
        bg: "rgba(167,139,250,0.1)",
        border: "rgba(167,139,250,0.18)",
        glow: "rgba(167,139,250,0.25)",
        name: "Slot Booking",
        desc: "Define your availability and auto-assign slots. Avoid double-bookings and track booked times.",
    },
    {
        icon: <BarChart2 size={17} />,
        color: "#fb923c",
        bg: "rgba(251,146,60,0.1)",
        border: "rgba(251,146,60,0.18)",
        glow: "rgba(251,146,60,0.25)",
        name: "Reports & Analytics",
        desc: "Track monthly collections, export Excel reports and gain insights into your practice.",
    },
];

const Patient = ({ showAlert }) => {
    const [role, setRole] = useState(null);
    //eslint-disable-next-line
    const [subscriptionStatus, setSubscriptionStatus] = useState("active");
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showEditServiceModal, setShowEditServiceModal] = useState(false);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const Modal = ({ isOpen, onClose, children }) => {
        if (!isOpen) return null;
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div
                    className="modal-container"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="modal-close" onClick={onClose}>
                        ✕
                    </button>
                    {children}
                </div>
            </div>
        );
    };

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
                if (data.success)
                    setSubscriptionStatus(data.subscription.status);
            })
            .catch(() => {});
    }, [API_BASE_URL]);

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
                            Clinic billing,
                            <br />
                            <em>simplified</em> for doctors
                        </h1>
                        <p className="lp-sub">
                            Manage patients, appointments, invoices and staff —
                            all in one place. Built for modern Indian clinics.
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

                    {/* Features */}
                    <section className="lp-features">
                        <div className="lp-section-eyebrow">What you get</div>
                        <h2 className="lp-section-title">
                            Everything a clinic <em>needs</em>
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
                </motion.div>
            </>
        );
    }

    // ── Logged in ──
    return (
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
                            setFabOpen(false);
                            setShowEditServiceModal(true);
                        }}
                    >
                        <Pencil size={16} />
                        <span>Edit Service</span>
                    </button>
                )}
            </div>

            <Modal
                isOpen={showPatientModal}
                onClose={() => setShowPatientModal(false)}
            >
                <AddPatient
                    showAlert={showAlert}
                    showModal={showPatientModal}
                    setShowModal={setShowPatientModal}
                />
            </Modal>
            <Modal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
            >
                <AddServices
                    showAlert={showAlert}
                    onClose={() => setShowServiceModal(false)}
                />
            </Modal>
            <Modal
                isOpen={showEditServiceModal}
                onClose={() => setShowEditServiceModal(false)}
            >
                <EditService
                    showAlert={showAlert}
                    onClose={() => setShowEditServiceModal(false)}
                />
            </Modal>

            <div className="app-page">
                {!showAppointment && !showPatientDetails && (
                    <PatientList
                        showAlert={showAlert}
                        openPatientDetails={openPatientDetails}
                    />
                )}
                {showAppointment && (
                    <div className="app-section">
                        <AddAppointment showAlert={showAlert} />
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
                            patientId={selectedPatientId}
                            showAlert={showAlert}
                            onClose={closePatientDetails}
                        />
                    </div>
                )}
            </div>
        </>
    );
};

export default Patient;
