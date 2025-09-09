import { useState, useEffect ,useRef } from "react";
import Patient from "./Patient";

const AddAppointment = () => {
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(
    localStorage.getItem("patient") 
      ? JSON.parse(localStorage.getItem("patient")) 
      : null
  );
    const closeBtnRef = useRef(null);
  useEffect(() => {
    const list = async () => {
      const response = await fetch("http://localhost:5001/api/auth/fetchallpatients", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token":
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U",
        },
      });
      const json = await response.json();
      setPatientsList(json);
      //console.log(json);
    };
    list();
  }, []);

  const handleSelect = (patient) => {
    setSelectedPatient(patient);
    localStorage.setItem("patient", JSON.stringify(patient));
    //console.log(localStorage.getItem("patient"));
    closeBtnRef.current?.click();
  };

  return (
    <>
      <div className="mb-3">
        <label htmlFor="patientName" className="form-label d-block">
          Patient Name
        </label>
        <button type="button" className="btn btn-primary" data-bs-toggle="modal" data-bs-target="#exampleModal">
            {selectedPatient ? selectedPatient.name : "Select Patient"}
        </button>
        <div className="modal fade" id="exampleModal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div className="modal-dialog">
            <div className="modal-content">
            <div className="modal-header">
                <h1 className="modal-title fs-5" id="exampleModalLabel">Modal title</h1>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
                <table className="table">
                    <tbody>
                        {patientsList.map((s) => (
                            <tr
                            key={s._id}
                            onClick={() => handleSelect(s)}
                            style={{ cursor: "pointer" }}
                            >
                            <td>{s.name}</td>
                            <td>{s.number}</td>
                            </tr>
                        ))}
                        </tbody>
                    
                </table>
                
            </div>
            <div className="modal-footer">
                <button type="button" className="btn btn-secondary close" data-bs-dismiss="modal" ref={closeBtnRef}>Close</button>
                <button type="button" className="btn btn-primary">Save changes</button>
            </div>
            </div>
        </div>
        </div>
      </div>

    </>
  );
};

export default AddAppointment;