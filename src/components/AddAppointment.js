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

  const [availableServices, setAvailableServices] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceAmounts, setServiceAmounts] = useState([]);
  const [amount, setAmount] = useState(0);

  const [searchText, setSearchText] = useState("");


    const API_BASE_URL = process.env.NODE_ENV === "production"
    ? "https://gmsc-backend.onrender.com"
    : "http://localhost:5001";

  // ✅ Fetch all patients
  useEffect(() => {
    const list = async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/fetchallpatients`,
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


  // ✅ Fetch all services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`);
        const data = await res.json(); // [{ name, amount }]
        setAvailableServices(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchServices();
  }, []);

  // ✅ Filter patients as user types
  useEffect(() => {
    const filtered = patientsList.filter((p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredPatients(filtered);
  }, [searchText, patientsList]);

  // ✅ Update serviceAmounts whenever services change
  useEffect(() => {
    const newAmounts = services.map((s) => {
      const obj = availableServices.find((svc) => svc.name === s);
      return obj?.amount || 0;
    });
    setServiceAmounts(newAmounts);

    const total = newAmounts.reduce((a, b) => a + b, 0);
    setAmount(total);
  }, [services, availableServices]);

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

  const handleServiceAmountChange = (index, value) => {
    const newAmounts = [...serviceAmounts];
    newAmounts[index] = Number(value);
    setServiceAmounts(newAmounts);

    const total = newAmounts.reduce((a, b) => a + b, 0);
    setAmount(total);
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert("Please select a patient first");
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/addappointment/${selectedPatient._id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ service: services, amount }),
        }
      );

      const result = await response.json();
      if (response.ok) {
        props.showAlert("Appointment added successfully!", "success");
        setServices([]);
        setServiceAmounts([]);
        setAmount(0);
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
            <ServiceList services={availableServices}        // ✅ Pass available services
        selectedServices={services}        // ✅ Current selected services
        onSelect={handleServiceSelect} />
          </div>

          {/* Bill Details with editable amounts */}
          {services.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Bill Details</label>
              <ul className="list-group mb-2">
                {services.map((s, index) => (
                  <li
                    key={s}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <span>{s}</span>
                    <input
                      type="number"
                      className="form-control w-25"
                      value={serviceAmounts[index]}
                      onChange={(e) =>
                        handleServiceAmountChange(index, e.target.value)
                      }
                    />
                  </li>
                ))}
              </ul>

              <label className="form-label">Total Amount</label>
              <input
                type="number"
                className="form-control"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary">
            Save Appointment
          </button>
        </form>
      )}
    </>
  );
};

export default AddAppointment;