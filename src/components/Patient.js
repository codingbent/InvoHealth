import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";
import PatientDetails from "./PatientDetails";
import EditService from "./EditService";
import { jwtDecode } from "jwt-decode";

const Patient = (props) => {
    const { showAlert } = props;
    const [role, setRole] = useState(null); // 🔑 role state
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const decoded = jwtDecode(token);
            setRole(decoded.user.role); // ✅ CORRECT
        } catch (err) {
            console.error("Invalid token");
            setRole(null);
        }
    }, []);

    // ========== CLOSE NAVBAR IF OPEN ==========
    const closeNavbarIfOpen = () => {
        const navbar = document.getElementById("navbarSupportedContent");
        if (navbar?.classList.contains("show")) {
            navbar.classList.remove("show");
        }
    };

    const updateclose = () => {
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

    // ========== OPEN MODAL (close sheet first) ==========
    const openModal = (id) => {
        closeNavbarIfOpen();
        const sheet = document.getElementById("actionSheet");

        // close sheet smoothly
        sheet.classList.remove("open");
        document.body.classList.remove("freeze-scroll");

        // hide sheet after animation
        setTimeout(() => sheet.classList.add("hidden"), 350);

        // show modal
        const modalEl = document.getElementById(id);
        const modal = new window.bootstrap.Modal(modalEl);
        modal.show();
    };

    // ========== SHOW ACTION SHEET ==========
    const showActionSheet = () => {
        closeNavbarIfOpen();
        const sheet = document.getElementById("actionSheet");
        sheet.classList.remove("hidden");
        sheet.classList.add("open");
        document.body.classList.add("freeze-scroll");
    };

    // ========== HIDE ACTION SHEET ==========
    const hideActionSheet = () => {
        const sheet = document.getElementById("actionSheet");
        sheet.classList.remove("open");
        document.body.classList.remove("freeze-scroll");

        setTimeout(() => {
            sheet.classList.add("hidden");
        }, 350);
    };

    return (
        <>
            {localStorage.getItem("token") ? (
                <>
                    {/* ACTION BUTTON */}
                    <div
                        className="w-75 mx-auto d-flex justify-content-center m-3 "
                        id="actionsWrapper"
                    >
                        <button
                            className="btn btn-primary actions-button w-100"
                            onClick={showActionSheet}
                        >
                            Actions
                        </button>
                    </div>

                    {/* ACTION SHEET */}
                    <div id="actionSheet" className="action-sheet hidden">
                        {/* ADD PATIENT — doctor + staff */}
                        {role && (
                            <button onClick={() => openModal("patientModal")}>
                                ➕ Add Patient
                            </button>
                        )}

                        {/* ADD SERVICE — ONLY DOCTOR */}
                        {role === "doctor" && (
                            <button onClick={() => openModal("serviceModal")}>
                                🧾 Add Service
                            </button>
                        )}

                        {/* ADD APPOINTMENT — doctor + staff */}
                        {role && (
                            <button
                                onClick={() => {
                                    hideActionSheet();
                                    setShowAppointment(true);
                                }}
                            >
                                📅 Add Appointment
                            </button>
                        )}

                        {/* EDIT SERVICE — ONLY DOCTOR */}
                        {role === "doctor" && (
                            <button
                                onClick={() => openModal("editServiceModal")}
                            >
                                ✏️ Edit Service
                            </button>
                        )}

                        <button
                            className="action-sheet-close"
                            onClick={hideActionSheet}
                        >
                            Close
                        </button>
                    </div>

                    {/* MODALS */}
                    <div className="modal fade" id="patientModal" tabIndex="-1">
                        <div className="modal-dialog">
                            <AddPatient showAlert={showAlert} />
                        </div>
                    </div>

                    <div className="modal fade" id="serviceModal" tabIndex="-1">
                        <div className="modal-dialog">
                            <AddServices showAlert={showAlert} />
                        </div>
                    </div>

                    <div
                        className="modal fade"
                        id="editServiceModal"
                        tabIndex="-1"
                    >
                        <div className="modal-dialog">
                            <EditService showAlert={showAlert} />
                        </div>
                    </div>

                    {/* MAIN PAGE */}
                    <div>
                        {!showAppointment && !showPatientDetails && (
                            <div className="patient-list">
                                <PatientList
                                    openPatientDetails={openPatientDetails}
                                />
                            </div>
                        )}

                        {showAppointment && (
                            <div className="appointment container">
                                <AddAppointment showAlert={props.showAlert} />
                                <button
                                    className="btn btn-secondary mt-2"
                                    onClick={updateclose}
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
            ) : (
                <div className="container text-center mt-5">
                    {/* Hero */}
                    <h1 className="fw-bold mb-3">Manage Your Clinic Smarter</h1>

                    <p className="text-theme-muted mb-4">
                        Patient records, appointments, billing, and Excel
                        reports — all in one simple system.
                    </p>

                    <div className="d-flex justify-content-center gap-3 mb-5">
                        <Link to="/login" className="btn btn-primary px-4">
                            Login
                        </Link>
                        <Link
                            to="/signup"
                            className="btn btn-outline-primary px-4"
                        >
                            Create Account
                        </Link>
                    </div>

                    {/* Features */}
                    <div className="row justify-content-center g-4 mt-4">
                        <div className="col-md-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <h5>🧾 Patient Records</h5>
                                    <p className="text-theme-muted small">
                                        Securely manage patient details and
                                        visit history.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <h5>📅 Appointments</h5>
                                    <p className="text-theme-muted small">
                                        Track visits, services, and doctor
                                        assignments.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-3">
                            <div className="card border-0 shadow-sm h-100">
                                <div className="card-body">
                                    <h5>📊 Excel Reports</h5>
                                    <p className="text-theme-muted small">
                                        Export filtered reports for accounting
                                        and analysis.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Patient;
