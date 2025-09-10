import { useState, useEffect } from "react";
import ServiceList from "./ServiceList";

export default function PatientDetails({ patientId, showAlert, onClose }) {
  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  const [patient, setPatient] = useState({
    name: "",
    service: [],
    number: "",
    age: "",
    amount: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Appointment editing
  const [editingAppt, setEditingAppt] = useState(null);
  const [apptData, setApptData] = useState({ date: "", service: [], amount: 0 });
  const [apptServiceAmounts, setApptServiceAmounts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [patientRes, appointmentsRes, servicesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/auth/patientdetails/${patientId}`, { headers: { "auth-token": token } }),
          fetch(`${API_BASE_URL}/api/auth/appointments/${patientId}`, { headers: { "auth-token": token } }),
          fetch(`${API_BASE_URL}/api/auth/fetchallservice`, { headers: { "auth-token": token } }),
        ]);

        const patientData = await patientRes.json();
        const appointmentsData = await appointmentsRes.json();
        const servicesData = await servicesRes.json();

        setPatient({
          name: patientData.name || "",
          service: patientData.service || [],
          number: patientData.number || "",
          age: patientData.age || "",
          amount: patientData.amount || 0,
        });
        setAppointments(appointmentsData || []);
        setAvailableServices(servicesData || []);
      } catch (err) {
        console.error("Error fetching patient details:", err);
        showAlert("Error fetching patient details", "danger");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  const handleChange = (e) => setPatient({ ...patient, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/auth/updatepatientdetails/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "auth-token": token },
        body: JSON.stringify(patient),
      });
      const result = await response.json();
      if (result.success) {
        showAlert("Patient updated successfully", "success");
        onClose();
      } else {
        showAlert(result.error || "Update failed", "danger");
      }
    } catch (err) {
      console.error(err);
      showAlert("Server error while updating", "danger");
    }
  };

  if (loading) return <p>Loading patient details...</p>;

  return (
    <div className="modal-content">
      <div className="modal-header">
        <h5 className="modal-title">Edit Patient Details</h5>
        <button type="button" className="btn-close" onClick={onClose}></button>
      </div>
      <div className="modal-body">
        <div className="mb-3">
          <label className="form-label">Name</label>
          <input type="text" className="form-control" name="name" value={patient.name} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Number</label>
          <input type="text" className="form-control" name="number" value={patient.number} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Age</label>
          <input type="number" className="form-control" name="age" value={patient.age} onChange={handleChange} />
        </div>
        {/* Appointments & services can be added here if needed */}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={handleSave}>
          Save changes
        </button>
      </div>
    </div>
  );
}