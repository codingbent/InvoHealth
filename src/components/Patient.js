import { useState } from "react";
import { Link } from "react-router-dom"; // ⬅️ Add this
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";
import PatientDetails from "./PatientDetails"; // Added import
import EditService from "./EditService";
import AppointmentRecord from "./AppointmentRecord";

const Patient = (props) => {
    const { showAlert } = props;
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false); // Added state
    const [selectedPatientId, setSelectedPatientId] = useState(null); // Added state

    const updateclose = () => {
        setShowAppointment(false);
        localStorage.removeItem("patient");
    };

    const openPatientDetails = (id) => {
        // Added function
        setSelectedPatientId(id);
        setShowPatientDetails(true);
    };

    const closePatientDetails = () => {
        // Added function
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
                // try to read json error
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

    return (
        <>
            {localStorage.getItem("token") != null ? (
                <>
                    <div className="mt-3 d-grid gap-2 d-md-flex justify-content-md-center">
                        {/* Modal for Adding patients */}
                        <button
                            type="button"
                            className="btn btn-primary"
                            data-bs-toggle="modal"
                            data-bs-target="#patientModal"
                        >
                            Add patient
                        </button>
                        <div
                            className="modal fade"
                            id="patientModal"
                            tabIndex="-1"
                            aria-labelledby="patientModalLabel"
                            aria-hidden="true"
                        >
                            <div className="modal-dialog">
                                <AddPatient showAlert={showAlert} />
                            </div>
                        </div>
                        {/* Modal for Adding services */}
                        <button
                            type="button"
                            className="btn btn-primary"
                            data-bs-toggle="modal"
                            data-bs-target="#serviceModal"
                        >
                            Add Service
                        </button>
                        <div
                            className="modal fade"
                            id="serviceModal"
                            tabIndex="-1"
                            aria-labelledby="serviceModalLabel"
                            aria-hidden="true"
                        >
                            <div className="modal-dialog">
                                <AddServices showAlert={showAlert} />
                            </div>
                        </div>
                        {/* Toggle appointment vs patient list */}
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setShowAppointment(true)}
                        >
                            Add Appointment
                        </button>
                        {showAppointment && (
                            <button
                                type="button"
                                className="btn btn-secondary ms-2"
                                onClick={updateclose}
                            >
                                Close
                            </button>
                        )}
                        {/* Edit Service button */}
                        <button
                            type="button"
                            className="btn btn-primary"
                            data-bs-toggle="modal"
                            data-bs-target="#editServiceModal"
                        >
                            Edit Service
                        </button>
                        {/* <AppointmentRecord/> */}
                        <div
                            className="modal fade"
                            id="editServiceModal"
                            tabIndex="-1"
                            aria-labelledby="editServiceModalLabel"
                            aria-hidden="true"
                        >
                            <div className="modal-dialog">
                                <EditService showAlert={showAlert} />
                            </div>
                        </div>
                        <button
                            className="btn btn-success mb-3 me-2"
                            onClick={downloadExcelSecure}
                        >
                            Download Excel (secure)
                        </button>
                    </div>

                    <div>
                        {!showAppointment && !showPatientDetails && (
                            <>
                                <div className="patient-list">
                                    <PatientList
                                        openPatientDetails={openPatientDetails}
                                    />{" "}
                                </div>
                            </>
                        )}
                        {showAppointment && (
                            <div className="appointment container">
                                <AddAppointment showAlert={props.showAlert} />
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
