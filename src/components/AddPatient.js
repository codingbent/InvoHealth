import { useState, useEffect } from "react";
import ServiceList from "./ServiceList";

const AddPatient = (props) => {
  const [patient, setPatient] = useState({
    name: "",
    service: [],
    number: "",
    amount: 0,
    age: "",
  });

  const [availableServices, setAvailableServices] = useState([]);
  const [serviceAmounts, setServiceAmounts] = useState([]);
  const [appointmentDate, setAppointmentDate] = useState(
    new Date().toISOString().slice(0, 10)
  ); // default today

  const { name, service, number, amount, age } = patient;

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  // Fetch services from backend
useEffect(() => {
  const fetchServices = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
        headers: {  "auth-token": localStorage.getItem("token") },
      });
      const data = await res.json();
      setAvailableServices(data); // only services for logged-in doc
    } catch (err) {
      console.error("Error fetching services:", err);
    }
  };
  fetchServices();
}, []);

  // Update service amounts when services change
  useEffect(() => {
    const newAmounts = service.map((s) => {
      const svc = availableServices.find((svc) => svc.name === s);
      return svc?.amount || 0;
    });
    setServiceAmounts(newAmounts);

    const total = newAmounts.reduce((a, b) => a + b, 0);
    setPatient((prev) => ({ ...prev, amount: total }));
  }, [service, availableServices]);

  const handleServiceSelect = (value, checked) => {
    setPatient((prev) => {
      const updatedServices = checked
        ? [...prev.service, value]
        : prev.service.filter((s) => s !== value);
      return { ...prev, service: updatedServices };
    });
  };

  const handleServiceAmountChange = (index, value) => {
    const newAmounts = [...serviceAmounts];
    newAmounts[index] = Number(value);
    setServiceAmounts(newAmounts);

    const total = newAmounts.reduce((a, b) => a + b, 0);
    setPatient((prev) => ({ ...prev, amount: total }));
  };

  const onChange = (e) =>
    setPatient({ ...patient, [e.target.name]: e.target.value });

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    // 1️⃣ Add patient
    const patientRes = await fetch(`${API_BASE_URL}/api/auth/addpatient`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "auth-token": localStorage.getItem("token"), // use actual token
      },
      body: JSON.stringify({ name, service, number, amount, age }),
    });

    const patientJson = await patientRes.json();
    if (!patientJson.success) {
      props.showAlert(patientJson.error || "Failed to add patient", "danger");
      return;
    }

    const newPatientId = patientJson.patient._id;

    // 2️⃣ Create initial appointment with **today's date**
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const appointmentRes = await fetch(
      `${API_BASE_URL}/api/auth/addappointment/${newPatientId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          amount,
          date: today, // use today for the initial appointment
        }),
      }
    );

    const appointmentJson = await appointmentRes.json();
    if (appointmentJson.success) {
      props.showAlert("Patient and appointment added successfully!", "success");
    } else {
      props.showAlert(
        appointmentJson.error || "Patient added but appointment failed",
        "warning"
      );
    }

    // Reset form
    setPatient({ name: "", service: [], number: "", amount: 0, age: "" });
    setServiceAmounts([]);
  } catch (err) {
    console.error(err);
    props.showAlert("Server error", "danger");
  }
};


  return (
    <form onSubmit={handleSubmit}>
      <div className="modal-content">
        <div className="modal-header">
          <h1 className="modal-title fs-5">
            Add Patient & Initial Appointment
          </h1>
          <button type="button" className="btn-close" data-bs-dismiss="modal" />
        </div>

        <div className="modal-body">
          {/* Name */}
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-control"
              name="name"
              value={name}
              onChange={onChange}
              required
            />
          </div>

          {/* Services */}
          <div className="mb-3">
            <label className="form-label">Services</label>
            <ServiceList
              onSelect={handleServiceSelect}
              selectedServices={service}
              services={availableServices}
            />
          </div>

          {/* Bill Details */}
          {service.length > 0 && (
            <div className="mb-3">
              <label className="form-label">Bill Details</label>
              <ul className="list-group mb-2">
                {service.map((s, index) => (
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
                onChange={(e) =>
                  setPatient({ ...patient, amount: Number(e.target.value) })
                }
              />
            </div>
          )}

          {/* Appointment Date */}
          <div className="mb-3">
            <label className="form-label">Appointment Date</label>
            <input
              type="date"
              className="form-control"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
            />
          </div>

          {/* Number */}
          <div className="mb-3">
            <label className="form-label">Number</label>
            <input
              type="number"
              className="form-control"
              name="number"
              value={number}
              onChange={onChange}
            />
          </div>

          {/* Age */}
          <div className="mb-3">
            <label className="form-label">Age</label>
            <input
              type="number"
              className="form-control"
              name="age"
              value={age}
              onChange={onChange}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            Close
          </button>
          <button type="submit" className="btn btn-primary">
            Add Patient & Appointment
          </button>
        </div>
      </div>
    </form>
  );
};

export default AddPatient;