import { useState, useEffect, useRef } from "react";
import ServiceList from "./ServiceList";

const AddPatient = ({ showAlert }) => {
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
  );

  const { name, service, number, amount, age } = patient;

  const modalRef = useRef(null);
  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  // Initialize modal instance
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.bsModal = window.bootstrap.Modal.getOrCreateInstance(
        modalRef.current
      );
    }
  }, []);

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
          headers: { "auth-token": localStorage.getItem("token") },
        });
        const data = await res.json();
        setAvailableServices(data);
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchServices();
  }, []);

  // Update total amount
  useEffect(() => {
    const total = service
      .map((s, index) => serviceAmounts[index] ?? s.amount ?? 0)
      .reduce((a, b) => a + b, 0);
    setPatient((prev) => ({ ...prev, amount: total }));
  }, [service, serviceAmounts]);

  // Handle service selection
  const handleServiceSelect = (serviceObj, checked) => {
    setPatient((prev) => {
      const updatedServices = checked
        ? [...prev.service, serviceObj]
        : prev.service.filter((s) => s._id !== serviceObj._id);
      return { ...prev, service: updatedServices };
    });

    setServiceAmounts((prevAmounts) => {
      const index = service.findIndex((s) => s._id === serviceObj._id);
      if (checked) return [...prevAmounts, serviceObj.amount ?? 0];
      else return prevAmounts.filter((_, i) => i !== index);
    });
  };

  // Update individual service amount
  const handleServiceAmountChange = (index, value) => {
    const newAmounts = [...serviceAmounts];
    newAmounts[index] = Number(value);
    setServiceAmounts(newAmounts);
  };

  const onChange = (e) =>
    setPatient({ ...patient, [e.target.name]: e.target.value });

  // Open modal programmatically
  const openModal = () => {
    if (modalRef.current?.bsModal) modalRef.current.bsModal.show();
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Add patient
      const patientRes = await fetch(`${API_BASE_URL}/api/auth/addpatient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
        body: JSON.stringify({
          name,
          service: service.map((s, index) => ({
            id: s._id,
            name: s.name,
            amount: serviceAmounts[index] ?? s.amount ?? 0,
          })),
          number,
          amount,
          age,
        }),
      });

      const patientJson = await patientRes.json();
      if (!patientJson.success) {
        showAlert(patientJson.error || "Failed to add patient", "danger");
        return;
      }

      const newPatientId = patientJson.patient._id;

      // Add initial appointment
      const appointmentRes = await fetch(
        `${API_BASE_URL}/api/auth/addappointment/${newPatientId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
          body: JSON.stringify({
            service: service.map((s, index) => ({
              id: s._id,
              name: s.name,
              amount: serviceAmounts[index] ?? s.amount ?? 0,
            })),
            amount,
            date: appointmentDate,
          }),
        }
      );

      const appointmentJson = await appointmentRes.json();
      if (appointmentJson.success) {
        showAlert("Patient and appointment added successfully!", "success");
        // Close modal programmatically
        if (modalRef.current?.bsModal) modalRef.current.bsModal.hide();
      } else {
        showAlert(
          appointmentJson.error || "Patient added but appointment failed",
          "warning"
        );
      }

      // Reset form
      setPatient({ name: "", service: [], number: "", amount: 0, age: "" });
      setServiceAmounts([]);
      setAppointmentDate(new Date().toISOString().slice(0, 10));
    } catch (err) {
      console.error(err);
      showAlert("Server error", "danger");
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button className="btn btn-primary mb-3" onClick={openModal}>
        Add Patient
      </button>

      {/* Modal */}
      <div
        className="modal fade"
        id="addPatientModal"
        tabIndex="-1"
        aria-hidden="true"
        ref={modalRef}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h1 className="modal-title fs-5">Add Patient & Initial Appointment</h1>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                />
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
                          key={s._id}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <span>{s.name}</span>
                          <input
                            type="number"
                            className="form-control w-25"
                            value={serviceAmounts[index] ?? s.amount ?? 0}
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
          </div>
        </form>
      </div>
    </>
  );
};

export default AddPatient;