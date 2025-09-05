import { useState } from "react";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";

const Patient = (props) => {
    const { showAlert } = props;
    const [showAppointment, setShowAppointment] = useState(false);
    return (
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
                <div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAppointment(true)}
                    >
                        Add Appointment
                    </button>
                </div>
            </div>

            {localStorage.getItem("token") != null ? (
                <div>
                    {!showAppointment && (
                        <div className="patient-list">
                            <PatientList />
                        </div>
                    )}
                    {showAppointment && (
                        <div className="appointment container">
                            <AddAppointment />
                        </div>
                    )}
                </div>
            ) : (
                <h1>Login to see Patient</h1>
            )}
        </>
    );
};
export default Patient;
