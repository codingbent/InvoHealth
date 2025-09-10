import { useEffect, useState } from "react";
import ServiceList from "./ServiceList";

const PatientDetails = ({ patientId, showAlert, onClose }) => {
  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  const [details, setDetails] = useState(null);
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
  const [editingPatient, setEditingPatient] = useState(false);

  // Appointment edit state
  const [editingAppt, setEditingAppt] = useState(null);
  const [apptData, setApptData] = useState({ date: "", service: [], amount: 0 });
  const [apptServiceAmounts, setApptServiceAmounts] = useState([]);
  const [editingAppointment, setEditingAppointment] = useState(false);

  // Convert backend UTC to IST
  const toISTDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const istOffset = 5.5 * 60; // IST +5:30
    const istDate = new Date(date.getTime() + istOffset * 60000);
    return istDate.toISOString().slice(0, 16);
  };

  // Convert IST to UTC
  const fromISTToUTC = (istDateTime) => {
    if (!istDateTime) return null;
    const [datePart, timePart] = istDateTime.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    return new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30));
  };

  // Fetch patient, appointments, services
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const [patientRes, appointmentsRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/patientdetails/${patientId}`, {
          headers: { "auth-token": token },
        }),
        fetch(`${API_BASE_URL}/api/auth/appointments/${patientId}`, {
          headers: { "auth-token": token },
        }),
        fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
          headers: { "auth-token": token },
        }),
      ]);

      const patientData = await patientRes.json();
      const appointmentsData = await appointmentsRes.json();
      const servicesData = await servicesRes.json();

      setDetails(patientData);
      setPatient({
        name: patientData.name || "",
        service: patientData.service || [],
        number: patientData.number || "",
        age: patientData.age || "",
        amount: patientData.amount || 0,
      });
      setAppointments(appointmentsData);
      setAvailableServices(servicesData);
    } catch (err) {
      console.error("Error fetching data:", err);
      showAlert?.("Failed to fetch patient details", "danger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  // Patient edit handlers
  const handleChange = (e) => setPatient({ ...patient, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/auth/updatepatientdetails/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "auth-token": token },
        body: JSON.stringify(patient),
      });
      const data = await res.json();
      if (res.ok) {
        setDetails(patient);
        setEditingPatient(false);
        showAlert?.("Patient updated successfully", "success");
      } else {
        showAlert?.(data.message || "Update failed", "danger");
      }
    } catch (err) {
      console.error(err);
      showAlert?.("Server error while updating", "danger");
    }
  };

  // Appointment edit handlers
  const handleEditAppt = (appt) => {
    const visit = appt.visits?.[0] || {};
    setEditingAppt(appt);
    setEditingAppointment(true);

    const serviceAmounts = (visit.service || []).map((s) =>
      typeof s === "object" ? s.amount || 0 : availableServices.find((svc) => svc.name === s)?.amount || 0
    );

    const serviceNames = (visit.service || []).map((s) => (typeof s === "object" ? s.name : s));

    setApptServiceAmounts(serviceAmounts);
    setApptData({
      date: toISTDateTime(visit.date),
      service: serviceNames,
      amount: serviceAmounts.reduce((a, b) => a + b, 0),
    });
  };

  const handleApptServiceChange = (serviceName, checked) => {
    setApptData((prev) => {
      let updatedServices = [...prev.service];
      let updatedAmounts = [...apptServiceAmounts];

      if (checked) {
        updatedServices.push(serviceName);
        const defaultAmount = availableServices.find((s) => s.name === serviceName)?.amount || 0;
        updatedAmounts.push(defaultAmount);
      } else {
        const index = updatedServices.indexOf(serviceName);
        updatedServices.splice(index, 1);
        updatedAmounts.splice(index, 1);
      }

      const total = updatedAmounts.reduce((a, b) => a + b, 0);
      setApptServiceAmounts(updatedAmounts);
      return { ...prev, service: updatedServices, amount: total };
    });
  };

  const handleUpdateAppt = async () => {
    if (!editingAppt) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/auth/updateappointment/${editingAppt.visits[0]._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "auth-token": token },
        body: JSON.stringify({
          date: fromISTToUTC(apptData.date),
          service: apptData.service.map((name, i) => ({ name, amount: apptServiceAmounts[i] })),
          amount: apptData.amount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showAlert?.("Appointment updated successfully", "success");
        fetchData();
        setEditingAppointment(false);
      } else {
        showAlert?.("Update failed: " + data.message, "danger");
      }
    } catch (err) {
      console.error(err);
      showAlert?.("Error updating appointment", "danger");
    }
  };

  if (loading) return <p>Loading patient details...</p>;

  return (
    <div className="container">
      <div className="mb-3">
        <button className="btn btn-secondary mb-2" onClick={onClose}>Back</button>

        {!editingPatient ? (
          <div>
            <h3>Name: {details?.name}</h3>
            <h3>Number: {details?.number}</h3>
            <h3>Age: {details?.age}</h3>
            <button className="btn btn-primary mt-2" onClick={() => setEditingPatient(true)}>Edit Details</button>
          </div>
        ) : (
          <div className="card p-3 mb-3">
            <div className="mb-2">
              <label>Name</label>
              <input type="text" className="form-control" name="name" value={patient.name} onChange={handleChange} />
            </div>
            <div className="mb-2">
              <label>Number</label>
              <input type="text" className="form-control" name="number" value={patient.number} onChange={handleChange} />
            </div>
            <div className="mb-2">
              <label>Age</label>
              <input type="number" className="form-control" name="age" value={patient.age} onChange={handleChange} />
            </div>
            <button className="btn btn-success mt-2" onClick={handleSave}>Save</button>
            <button className="btn btn-secondary mt-2 ms-2" onClick={() => setEditingPatient(false)}>Cancel</button>
          </div>
        )}
      </div>

      {/* Appointments Table */}
      <div className="mt-3">
        <h4>Appointments</h4>
        {appointments.length === 0 ? <p>No appointments</p> :
          appointments.map((appt) =>
            appt.visits?.map((visit) => (
              <div key={visit._id} className="card p-2 mb-2">
                <p><b>Date:</b> {visit.date ? new Date(visit.date).toLocaleString("en-IN") : "N/A"}</p>
                <p><b>Services:</b> {(visit.service || []).map(s => typeof s === "object" ? s.name : s).join(", ")}</p>
                <p><b>Amount:</b> {visit.amount}</p>
                <button className="btn btn-warning me-2" onClick={() => handleEditAppt({ visits: [visit] })}>Edit</button>
              </div>
            ))
          )
        }
      </div>

      {/* Appointment Edit */}
      {editingAppointment && (
        <div className="card p-3 mt-3">
          <h5>Edit Appointment</h5>
          <div className="mb-2">
            <label>Date</label>
            <input type="datetime-local" className="form-control" value={apptData.date} onChange={e => setApptData(prev => ({ ...prev, date: e.target.value }))} />
          </div>
          <div className="mb-2">
            <label>Services</label>
            <ServiceList services={availableServices} selectedServices={apptData.service} onSelect={handleApptServiceChange} />
          </div>
          {apptData.service.length > 0 && (
            <div className="mb-2">
              <label>Bill Details</label>
              {apptData.service.map((s, i) => (
                <div key={s} className="d-flex align-items-center mb-1">
                  <span className="me-2">{s}</span>
                  <input type="number" className="form-control w-25" value={apptServiceAmounts[i]} onChange={e => {
                    const newAmounts = [...apptServiceAmounts];
                    newAmounts[i] = Number(e.target.value);
                    setApptServiceAmounts(newAmounts);
                    const total = newAmounts.reduce((a, b) => a + b, 0);
                    setApptData(prev => ({ ...prev, amount: total }));
                  }} />
                </div>
              ))}
              <p>Total: {apptData.amount}</p>
            </div>
          )}
          <button className="btn btn-success me-2" onClick={handleUpdateAppt}>Save</button>
          <button className="btn btn-secondary" onClick={() => setEditingAppointment(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
};

export default PatientDetails;