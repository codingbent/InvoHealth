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
} from "lucide-react";
import { motion } from "framer-motion";
import Pricing from "./Pricing";

const Patient = ({ showAlert }) => {
    const [role, setRole] = useState(null);
    //eslint-disable-next-line
    const [subscriptionStatus, setSubscriptionStatus] = useState("active");
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);

    // ✅ Modal states (React controlled)
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showEditServiceModal, setShowEditServiceModal] = useState(false);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // ✅ Custom Modal
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

    // ── Landing ──
    if (!localStorage.getItem("token")) {
        return (
            <motion.div
                className="lp-root"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1>InvoHealth</h1>
                <Link to="/login">Login</Link>
                <Pricing />
            </motion.div>
        );
    }

    // ── Logged in ──
    return (
        <>
            {/* FAB BACKDROP */}
            {fabOpen && (
                <div
                    className="fab-backdrop"
                    onClick={() => setFabOpen(false)}
                />
            )}

            {/* FAB */}
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

                {/* Add Patient */}
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

                {/* Add Appointment */}
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

                {/* Add Service */}
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

                {/* Edit Service */}
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

            {/* ✅ MODALS (React only) */}

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

            {/* MAIN CONTENT */}
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
