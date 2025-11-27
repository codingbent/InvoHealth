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
            const res = await fetch(
                `${API_BASE_URL}/api/report/download-excel`,
                {
                    method: "GET",
                    headers: {
                        "auth-token": token,
                    },
                }
            );

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

    // 🔥 Bootstrap modal opener (works 100%)
    const openModal = (id) => {
        document.getElementById("actionSheet").classList.remove("open");

        const modalEl = document.getElementById(id);
        const modal = new window.bootstrap.Modal(modalEl);
        modal.show();
    };

    return (
        <>
            {localStorage.getItem("token") != null ? (
                <>
                    {/* ================= PREMIUM ACTION BUTTON ================= */}
                    <div
                        className="w-100 d-flex justify-content-center mt-3"
                        id="actionsWrapper"
                    >
                        <button
                            className="btn btn-primary actions-button w-25"
                            onClick={() =>
                                document
                                    .getElementById("actionSheet")
                                    .classList.add("open")
                            }
                        >
                            Actions
                        </button>
                    </div>

                    {/* ================= ACTION SHEET PANEL ================= */}
                    <div id="actionSheet" className="action-sheet">
                        <button onClick={() => openModal("patientModal")}>
                            ➕ Add Patient
                        </button>

                        <button onClick={() => openModal("serviceModal")}>
                            🧾 Add Service
                        </button>

                        <button
                            onClick={() => {
                                document
                                    .getElementById("actionSheet")
                                    .classList.remove("open");
                                setShowAppointment(true);
                            }}
                        >
                            📅 Add Appointment
                        </button>

                        <button onClick={() => openModal("editServiceModal")}>
                            ✏️ Edit Service
                        </button>

                        <button onClick={downloadExcelSecure}>
                            ⬇️ Download Excel
                        </button>

                        <button
                            className="action-sheet-close"
                            onClick={() =>
                                document
                                    .getElementById("actionSheet")
                                    .classList.remove("open")
                            }
                        >
                            Close
                        </button>
                    </div>

                    {/* ================= MODALS (WORKING) ================= */}

                    {/* Add Patient Modal */}
                    <div
                        className="modal fade"
                        id="patientModal"
                        tabIndex="-1"
                        aria-hidden="true"
                    >
                        <div className="modal-dialog">
                            <AddPatient showAlert={showAlert} />
                        </div>
                    </div>

                    {/* Add Service Modal */}
                    <div
                        className="modal fade"
                        id="serviceModal"
                        tabIndex="-1"
                        aria-hidden="true"
                    >
                        <div className="modal-dialog">
                            <AddServices showAlert={showAlert} />
                        </div>
                    </div>

                    {/* Edit Service Modal */}
                    <div
                        className="modal fade"
                        id="editServiceModal"
                        tabIndex="-1"
                        aria-hidden="true"
                    >
                        <div className="modal-dialog">
                            <EditService showAlert={showAlert} />
                        </div>
                    </div>

                    {/* ================= MAIN PAGE ================= */}
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
