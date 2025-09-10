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
  const [services, setServices] = useState([]); // ✅ stores selected service objects
  const [serviceAmounts, setServiceAmounts] = useState({}); // ✅ key = serviceId
  const [amount, setAmount] = useState(0);

  const [searchText, setSearchText] = useState("");

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  // ✅ Fetch all patients
  useEffect(() => {
    const list = async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/fetchallpatients`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token":
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U",
        },
      });
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
        const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
          headers: {
            "Content-Type": "application/json",
            "auth-token":
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U",
          },
        });
        const data = await res.json(); // [{ _id, name, amount }]
        setAvailableServices(data);
      } catch (err) {
        console.error("Error fetching services:", err);
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

  // ✅ Recalculate total whenever services or serviceAmounts change
  useEffect(() => {
    const total = services.reduce(
      (acc, s) => acc + (serviceAmounts[s._id] ?? s.amount ?? 0),
      0
    );
    setAmount(total);
  }, [services, serviceAmounts]);

  const handleSelect = (patient) => {
    setSelectedPatient(patient);
    localStorage.setItem("patient", JSON.stringify(patient));
    setSearchText("");
  };

  const handleServiceSelect = (service, checked) => {
    setServices((prev) =>
      checked ? [...prev, service] : prev.filter((s) => s._id !== service._id)
    );
  };

  const handleServiceAmountChange = (id, value) => {
    setServiceAmounts((prev) => ({
      ...prev,
      [id]: Number(value),
    }));
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
          headers: {
            "Content-Type": "application/json",
            "auth-token":
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U",
          },
          body: JSON.stringify({
            services: services.map((s) => ({
              id: s._id,
              name: s.name,
              amount: serviceAmounts[s._id] ?? s.amount,
            })),
            amount,
          }),
        }
      );

      const result = await response.json();
      if (response.ok) {
        props.showAlert("Appointment added successfully!", "success");
        setServices([]);
        setServiceAmounts({});
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
            <ServiceList
              services={availableServices}
              selectedServices={services}
              onSelect={handleServiceSelect}
            />
          </div>

          {/* Bill Details with editable amounts */}
          {services.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Bill Details</label>
              <ul className="list-group mb-2">
                {services.map((s) => (
                  <li
                    key={s._id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <span>{s.name}</span>
                    <input
                      type="number"
                      className="form-control w-25"
                      value={serviceAmounts[s._id] ?? s.amount}
                      onChange={(e) =>
                        handleServiceAmountChange(s._id, e.target.value)
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
                readOnly
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