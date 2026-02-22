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
} from "lucide-react";

const Patient = ({ showAlert }) => {
    const [role, setRole] = useState(null);
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);

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

    // If Not Logged In → Landing Page
    if (!localStorage.getItem("token")) {
        return (
            <div className="container text-center mt-5">
                <h1 className="fw-bold mb-3">Manage Your Clinic Smarter</h1>

                <p className="text-theme-secondary mb-4">
                    Patient records, appointments, billing, and Excel reports —
                    all in one simple system.
                </p>

                <div className="d-flex justify-content-center gap-3 mb-5">
                    <Link to="/login" className="btn btn-primary px-4">
                        <LogIn size={18} />
                        <span> Login</span>
                    </Link>
                    <Link to="/signup" className="btn btn-outline-primary px-4">
                        <UserPlus size={18} />
                        <span> Create Account</span>
                    </Link>
                </div>

                <div className="row justify-content-center g-4 mt-4">
                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <FileText size={18} />
                                <h5> Patient Records</h5>
                                <p className="text-theme-secondary small">
                                    Securely manage patient details and visit
                                    history.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <Calendar size={22} />
                                <h5>Appointments</h5>
                                <p className="text-theme-secondary small">
                                    Track visits, services, and doctor
                                    assignments.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body">
                                <BarChart3 size={22} />
                                <h5>Excel Reports</h5>
                                <p className="text-theme-secondary small">
                                    Export filtered reports for accounting and
                                    analysis.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                        data-bs-toggle="modal"
                        data-bs-target="#patientModal"
                        onClick={() => setFabOpen(false)}
                    >
                        <UserPlus size={18} />
                        <span className="fab-text">Add Patient</span>
                    </button>
                )}

                {role === "doctor" && (
                    <button
                        className={`fab-item ${fabOpen ? "show" : ""}`}
                        style={{ "--i": 2 }}
                        data-bs-toggle="modal"
                        data-bs-target="#serviceModal"
                        onClick={() => setFabOpen(false)}
                    >
                        <FileText size={18} />
                        <span className="fab-text">Add Service</span>
                    </button>
                )}

                {role && (
                    <button
                        className={`fab-item ${fabOpen ? "show" : ""}`}
                        style={{ "--i": 3 }}
                        onClick={() => {
                            setFabOpen(false);
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
                        style={{ "--i": 4 }}
                        data-bs-toggle="modal"
                        data-bs-target="#editServiceModal"
                        onClick={() => setFabOpen(false)}
                    >
                        <Pencil size={18} />
                        <span className="fab-text">Edit Service</span>
                    </button>
                )}
            </div>

            {/* MODALS */}
            <div className="modal fade" id="patientModal" tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <AddPatient showAlert={showAlert} />
                </div>
            </div>

            <div className="modal fade" id="serviceModal" tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <AddServices showAlert={showAlert} />
                </div>
            </div>

            <div className="modal fade" id="editServiceModal" tabIndex="-1">
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <EditService showAlert={showAlert} />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="page-container px-2 px-md-4">
                {!showAppointment && !showPatientDetails && (
                    <PatientList openPatientDetails={openPatientDetails} />
                )}

                {showAppointment && (
                    <div className="appointment container mt-3">
                        <AddAppointment showAlert={showAlert} />
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
        </>
    );
};

export default Patient;
