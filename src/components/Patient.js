import { useState } from "react";
import { Link } from "react-router-dom";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";
import PatientDetails from "./PatientDetails";
import EditService from "./EditService";

const Patient = (props) => {
    const { showAlert } = props;
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

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

    const downloadExcelSecure = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/report/download-excel`, {
                method: "GET",
                headers: { "auth-token": token },
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Download failed: ${res.status} ${txt}`);
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");

            const filename =
                res.headers.get("content-disposition")?.split("filename=")[1] ||
                "visit-records.xlsx";

            a.href = url;
            a.download = filename.replace(/"/g, "");
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download error:", err);
            alert("Download failed. See console for details.");
        }
    };

    // ========== OPEN MODAL (close sheet first) ==========
    const openModal = (id) => {
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
                    <div className="w-100 d-flex justify-content-center mt-3" id="actionsWrapper">
                        <button
                            className="btn btn-primary actions-button w-100"
                            onClick={showActionSheet}
                        >
                            Actions
                        </button>
                    </div>

                    {/* ACTION SHEET */}
                    <div id="actionSheet" className="action-sheet hidden">
                        <button onClick={() => openModal("patientModal")}>➕ Add Patient</button>
                        <button onClick={() => openModal("serviceModal")}>🧾 Add Service</button>

                        <button
                            onClick={() => {
                                hideActionSheet();
                                setShowAppointment(true);
                            }}
                        >
                            📅 Add Appointment
                        </button>

                        <button onClick={() => openModal("editServiceModal")}>✏️ Edit Service</button>
                        <button onClick={downloadExcelSecure}>⬇️ Download Excel</button>

                        <button className="action-sheet-close" onClick={hideActionSheet}>
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

                    <div className="modal fade" id="editServiceModal" tabIndex="-1">
                        <div className="modal-dialog">
                            <EditService showAlert={showAlert} />
                        </div>
                    </div>

                    {/* MAIN PAGE */}
                    <div>
                        {!showAppointment && !showPatientDetails && (
                            <div className="patient-list">
                                <PatientList openPatientDetails={openPatientDetails} />
                            </div>
                        )}

                        {showAppointment && (
                            <div className="appointment container">
                                <AddAppointment showAlert={props.showAlert} />
                                <button className="btn btn-secondary mt-2" onClick={updateclose}>
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
                <div className="text-center mt-5">
                    <h3 className="mb-3">Login to see Patients</h3>
                    <Link to="/login" className="btn btn-primary">
                        Go to Login
                    </Link>
                </div>
            )}
        </>
    );
};

export default Patient;
