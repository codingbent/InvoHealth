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
    LogIn,
    FileText,
    CalendarPlus,
    Pencil,
    Calendar,
    BarChart3,
    Receipt,
} from "lucide-react";
import { motion } from "framer-motion";
import Pricing from "./Pricing";

const Patient = ({ showAlert }) => {
    const [role, setRole] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState("active");
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const decoded = jwtDecode(token);
            setRole(decoded.user.role);
        } catch (err) {
            console.error("Invalid token");
            setRole(null);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        fetch(`${API_BASE_URL}/api/doctor/subscription`, {
            headers: {
                "auth-token": token,
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.success) {
                    setSubscriptionStatus(data.subscription.status);
                }
            })
            .catch(() => {});
    }, [API_BASE_URL]);
    // Navigation Handlers
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

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const nextBillingDate = trialEnd.toLocaleDateString("en-IN");

    const handleRestrictedAction = (e, modalId) => {
        if (subscriptionStatus === "expired") {
            e.preventDefault();
            e.stopPropagation();
            setSubscriptionStatus("Expired");
            showAlert("Plan expired. Please upgrade.", "danger");
            return;
        }

        // manually open modal
        const modal = new window.bootstrap.Modal(
            document.getElementById(modalId),
        );
        modal.show();
    };
    if (!localStorage.getItem("token")) {
        return (
            <motion.div
                className="container py-5"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                {/* HERO */}

                <div className="text-center mb-5">
                    <h1 className="fw-bold mb-3">
                        Smart Clinic Management for Modern Doctors
                    </h1>

                    <p className="text-theme-secondary mb-4">
                        InvoHealth helps clinics manage{" "}
                        <strong>
                            patients, appointments, billing, and reports
                        </strong>{" "}
                        in one simple system.
                    </p>

                    <div className="d-flex justify-content-center gap-3">
                        <a href="#pricing" className="btn btn-primary px-4">
                            <UserPlus size={18} />
                            <span className="ms-2">Start Free Trial</span>
                        </a>

                        <Link
                            to="/login"
                            className="btn btn-outline-primary px-4"
                        >
                            <LogIn size={18} />
                            <span className="ms-2">Login</span>
                        </Link>
                    </div>
                </div>

                {/* FEATURES */}

                <div className="row justify-content-center g-4 mb-5">
                    {/* PATIENT RECORDS */}

                    <div className="col-lg-3 col-md-6">
                        <div className="card feature-card border-0 shadow-sm h-100 text-center p-4">
                            <FileText size={28} className="text-primary" />
                            <h5 className="mt-3">Patient Records</h5>
                            <p className="text-theme-secondary small">
                                Securely store patient details, visit history,
                                and prescriptions in one place.
                            </p>
                        </div>
                    </div>

                    {/* APPOINTMENTS */}

                    <div className="col-lg-3 col-md-6">
                        <div className="card feature-card border-0 shadow-sm h-100 text-center p-4">
                            <Calendar size={28} className="text-primary" />
                            <h5 className="mt-3">Appointments</h5>
                            <p className="text-theme-secondary small">
                                Manage appointments and track doctor schedules
                                and patient visits easily.
                            </p>
                        </div>
                    </div>

                    {/* ANALYTICS */}

                    <div className="col-lg-3 col-md-6">
                        <div className="card feature-card border-0 shadow-sm h-100 text-center p-4">
                            <BarChart3 size={28} className="text-primary" />
                            <h5 className="mt-3">Analytics Dashboard</h5>
                            <p className="text-theme-secondary small">
                                Monitor revenue, payment distribution, visits,
                                and top-performing services with visual charts.
                            </p>
                        </div>
                    </div>

                    {/* BILLING */}

                    <div className="col-lg-3 col-md-6">
                        <div className="card feature-card border-0 shadow-sm h-100 text-center p-4">
                            <Receipt size={28} className="text-primary" />
                            <h5 className="mt-3">Billing & Invoices</h5>
                            <p className="text-theme-secondary small">
                                Generate professional invoices and track clinic
                                payments and collections easily.
                            </p>
                        </div>
                    </div>
                </div>

                {/* FREE TRIAL NOTICE */}

                <div id="pricing">
                    <div className="alert alert-success text-center shadow-sm my-2">
                        <strong>30-Day Free Trial</strong> - No payment required
                        today.
                        <br />
                        Billing starts only after your trial period ends i.e.{" "}
                        <strong>{nextBillingDate}</strong>
                    </div>
                    <Pricing />
                </div>
            </motion.div>
        );
    }

    // Logged In Layout
    return (
        <>
            {fabOpen && (
                <div
                    className="fab-backdrop"
                    onClick={() => setFabOpen(false)}
                />
            )}
            {/* FLOATING CREATE ACTION FAB */}
            <div
                className={`fab-container ${fabOpen ? "open" : ""}`}
                onClick={() => setFabOpen(false)}
            >
                <button
                    className={`fab-main ${fabOpen ? "open" : ""}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        setFabOpen(!fabOpen);
                    }}
                >
                    {fabOpen ? <Plus size={24} /> : <Plus size={24} />}
                </button>

                {role && (
                    <button
                        className={`fab-item ${fabOpen ? "show" : ""}`}
                        style={{ "--i": 1 }}
                        onClick={(e) => {
                            if (subscriptionStatus === "expired") {
                                showAlert(
                                    "Plan expired. Please upgrade.",
                                    "danger",
                                );
                                return;
                            }
                            setFabOpen(false);
                        }}
                        data-bs-toggle="modal"
                        data-bs-target="#patientModal"
                    >
                        <UserPlus size={18} />
                        <span className="fab-text">Add Patient</span>
                    </button>
                )}

                {role && (
                    <button
                        className={`fab-item ${fabOpen ? "show" : ""}`}
                        style={{ "--i": 3 }}
                        onClick={(e) => {
                            setFabOpen(false);

                            if (subscriptionStatus === "expired") {
                                showAlert(
                                    "Plan expired. Please upgrade.",
                                    "danger",
                                );
                                return;
                            }

                            setShowAppointment(true);
                        }}
                    >
                        <CalendarPlus size={18} />
                        <span className="fab-text">Add Appointment</span>
                    </button>
                )}

                {role === "doctor" && (
                    <button
                        className={`fab-item ${fabOpen ? "show" : ""}`}
                        style={{ "--i": 2 }}
                        data-bs-toggle="modal"
                        data-bs-target="#serviceModal"
                        onClick={(e) => {
                            setFabOpen(false);
                            handleRestrictedAction(e, "serviceModal");
                        }}
                    >
                        <FileText size={18} />
                        <span className="fab-text">Add Service</span>
                    </button>
                )}

                {role === "doctor" && (
                    <button
                        className={`fab-item ${fabOpen ? "show" : ""}`}
                        style={{ "--i": 4 }}
                        data-bs-toggle="modal"
                        data-bs-target="#editServiceModal"
                        onClick={(e) => {
                            setFabOpen(false);
                            handleRestrictedAction(e, "editServiceModal");
                        }}
                    >
                        <Pencil size={18} />
                        <span className="fab-text">Edit Service</span>
                    </button>
                )}
            </div>

            {/* MODALS */}
            <div className="modal fade" id="patientModal" tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    {subscriptionStatus === "active" && (
                        <AddPatient showAlert={showAlert} />
                    )}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="page-container px-2 px-md-4">
                {!showAppointment && !showPatientDetails && (
                    <PatientList
                        showAlert={showAlert}
                        openPatientDetails={openPatientDetails}
                    />
                )}

                {showAppointment && (
                    <div className="appointment container mt-3">
                        {subscriptionStatus === "active" && (
                            <AddAppointment showAlert={showAlert} />
                        )}
                        <button
                            className="btn btn-secondary mt-3"
                            onClick={closeAppointment}
                        >
                            Close
                        </button>
                    </div>
                )}

                {showPatientDetails && selectedPatientId && (
                    <div className="patient-details container mt-3">
                        <PatientDetails
                            patientId={selectedPatientId}
                            showAlert={showAlert}
                            onClose={closePatientDetails}
                        />
                    </div>
                )}
            </div>

            <div className="modal fade" id="serviceModal" tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    {subscriptionStatus === "active" && (
                        <AddServices showAlert={showAlert} />
                    )}
                </div>
            </div>

            <div className="modal fade" id="editServiceModal" tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <EditService showAlert={showAlert} />
                </div>
            </div>
        </>
    );
};

export default Patient;
