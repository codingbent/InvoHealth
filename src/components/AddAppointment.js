import { useState, useEffect } from "react";
import ServiceList from "./ServiceList";

const AddAppointment = (props) => {
  const [patientsList, setPatientsList] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(
    localStorage.getItem("patient")
      ? JSON.parse(localStorage.getItem("patient"))
      : null
  );
  const [services, setServices] = useState([]);
  const [amount, setAmount] = useState("");
  const [searchText, setSearchText] = useState("");

  // Fetch all patients
  useEffect(() => {
    const list = async () => {
      const response = await fetch(
        "http://localhost:5001/api/auth/fetchallpatients",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": "your-auth-token-here",
          },
        }
      );
      const json = await response.json();
      setPatientsList(json);
      setFilteredPatients(json);
    };
    list();
  }, []);

  // Filter patients as user types
  useEffect(() => {
    const filtered = patientsList.filter((p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredPatients(filtered);
  }, [searchText, patientsList]);

  const handleSelect = (patient) => {
    setSelectedPatient(patient);
    localStorage.setItem("patient", JSON.stringify(patient));
    setSearchText("");
  };

  const handleServiceSelect = (value, checked) => {
    setServices((prev) =>
      checked ? [...prev, value] : prev.filter((s) => s !== value)
    );
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert("Please select a patient first");
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:5001/api/auth/addappointment/${selectedPatient._id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: services, amount: Number(amount) }),
        }
      );

      const result = await response.json();
      if (response.ok) {
        props.showAlert("Appointment added successfully!", "success");
        setServices([]);
        setAmount("");
        setSelectedPatient(null);
        localStorage.removeItem("patient");
      } else {
        alert("Error: " + (result.message || "Failed to add appointment"));
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  return (
    <>
      {/* Patient Search & Select */}
      <div className="mb-3">
        <label htmlFor="patientSearch" className="form-label">
          Patient Name
        </label>
        <input
          type="text"
          className="form-control"
          id="patientSearch"
          placeholder="Type to search patient..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {searchText && (
          <ul className="list-group mt-1">
            {filteredPatients.map((p) => (
              <li
                key={p._id}
                className="list-group-item list-group-item-action"
                style={{ cursor: "pointer" }}
                onClick={() => handleSelect(p)}
              >
                {p.name} - {p.number}
              </li>
            ))}
            {filteredPatients.length === 0 && (
              <li className="list-group-item">No patients found</li>
            )}
          </ul>
        )}
        {selectedPatient && (
          <div className="mt-2">
            <strong>Selected Patient:</strong> {selectedPatient.name}
          </div>
        )}
      </div>

      {/* Appointment form */}
      {selectedPatient && (
        <form onSubmit={handleAddAppointment}>
          <div className="mb-3">
            <label className="form-label">Services</label>
            <ServiceList onSelect={handleServiceSelect} />
          </div>
          <div className="mb-3">
            <label className="form-label">Amount</label>
            <input
              type="number"
              className="form-control"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save Appointment
          </button>
        </form>
      )}
    </>
  );
};

export default AddAppointment;