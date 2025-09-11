import { useState } from "react";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";
import PatientDetails from "./PatientDetails"; // Added import
import EditService from "./EditService";

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
                    </div>

                    <div>
                        {!showAppointment && !showPatientDetails && (
                            <div className="patient-list">
                                <PatientList
                                    openPatientDetails={openPatientDetails}
                                />{" "}
                                {/* Pass function */}
                            </div>
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
                <h1>Login to see Patient</h1>
            )}
        </>
    );
};

export default Patient;