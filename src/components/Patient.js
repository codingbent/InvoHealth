import { useState } from "react";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";
import ServiceList from "./ServiceList";

const Patient = (props) => {
    const { showAlert } = props;
    const [showAppointment, setShowAppointment] = useState(false);
    // const [patients,setpatients]=useState({});
    const [patients, setpatients] = useState({
        name: "",
        service: [],
        number: "",
        amount: ""
    });
        const handlesubmit= async(e)=>{
            e.preventDefault();
            const response=await fetch("http://localhost:5001/api/auth/fetchallpatients",{
                method:"GET",
                headers:{
                    "Content-Type":"application/json",
                    "auth-token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U"
                },
                // body :JSON.stringify(response)
                
            })
            const json = await response.json();
            setpatients(json[0])
            //console.log(patients);
            
        }
        const updateadd=()=>{
            if(localStorage.getItem('patient')==null){
                alert("Select Patient")
            }
            else{
                setShowAppointment(false);
                localStorage.removeItem('patient');
                props.showAlert('Appointment Added','success')
            }
        }
        const updateclose=()=>{
            setShowAppointment(false);
            localStorage.removeItem('patient');
        }
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
                    <button
                    type="button"
                        className="btn btn-primary"
                        onClick={() => setShowAppointment(true)}
                    >
                        Add Appointment
                    </button>
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
                            <form onSubmit={handlesubmit}>
                                <AddAppointment/>
                                <div className="mb-3">
                                    <label className="form-label">Services</label>
                                <ServiceList
                                    onSelect={(value, checked) => {
                                    setpatients((prev) => {
                                    const currentServices = Array.isArray(prev.service) ? prev.service : [];

                                    let updatedServices;
                                    if (checked) {
                                        updatedServices = [...currentServices, value];
                                    } else {
                                        updatedServices = currentServices.filter((s) => s !== value);
                                    }
                                    return { ...prev, service: updatedServices };
                                    });
                                }}
                                />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label" htmlFor="amount" >
                                    Enter amount:
                                </label>
                                <input className="form-control" type="number" id="amount" placeholder="Enter Amount"/>
                                </div>
                                
                                <button type="submit" className="btn btn-primary" onClick={updateadd}>Add Appointment</button>
                                <button className="btn btn-primary ms-2" onClick={updateclose}>Close</button>
                            </form>
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
