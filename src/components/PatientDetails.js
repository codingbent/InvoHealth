import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ServiceList from "./ServiceList";

export default function PatientDetails() {
  const API_BASE_URL = process.env.NODE_ENV === "production"
    ? "https://gmsc-backend.onrender.com"
    : "http://localhost:5001";
    
  const { id } = useParams();
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

  // Appointment edit state
  const [editingAppt, setEditingAppt] = useState(null);
  const [apptData, setApptData] = useState({ date: "", service: [], amount: 0 });
  const [apptServiceAmounts, setApptServiceAmounts] = useState([]);

  // Convert backend UTC to IST for datetime-local input
  const toISTDateTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const istOffset = 5.5 * 60; // IST +5:30 in minutes
    const istDate = new Date(date.getTime() + istOffset * 60000);
    return istDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  };

  // Convert IST input back to UTC for backend storage
  const fromISTToUTC = (istDateTime) => {
    if (!istDateTime) return null;
    const [datePart, timePart] = istDateTime.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    return new Date(Date.UTC(year, month - 1, day, hours - 5, minutes - 30));
  };

  // Fetch patient, appointments, and services
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token"); // Auth token
      const [patientRes, appointmentsRes, servicesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/patientdetails/${id}`, { headers: { "auth-token": token } }),
        fetch(`${API_BASE_URL}/api/auth/appointments/${id}`, { headers: { "auth-token": token } }),
        fetch(`${API_BASE_URL}/api/auth/fetchallservice`, { headers: { "auth-token": token } }),
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleChange = (e) => setPatient({ ...patient, [e.target.name]: e.target.value });

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/auth/updatepatientdetails/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "auth-token": token },
        body: JSON.stringify(patient),
      });
      const result = await response.json();
      if (response.ok) {
        setDetails(patient);
        alert("Patient updated successfully");
      } else {
        alert("Error: " + (result.message || "Update failed"));
      }
    } catch (err) {
      console.error(err);
      alert("Server error while updating");
    }
  };

  const handleEditAppt = (appt) => {
    const visit = appt.visits?.[0] || {};
    setEditingAppt(appt);

    const serviceAmounts = (visit.service || []).map((s) => {
      if (typeof s === "object") return s.amount || 0;
      return availableServices.find((svc) => svc.name === s)?.amount || 0;
    });

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
        const defaultAmount = availableServices.find(s => s.name === serviceName)?.amount || 0;
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
    const response = await fetch(`${API_BASE_URL}/api/auth/updateappointment/${editingAppt.visits[0]._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "auth-token": token },
      body: JSON.stringify({
        date: fromISTToUTC(apptData.date),
        service: apptData.service.map((name, i) => ({ name, amount: apptServiceAmounts[i] })),
        amount: apptData.amount,
      }),
    });
    const data = await response.json();
    if (data.success) {
      alert("Appointment updated successfully!");
      fetchData(); // Refresh table
    } else {
      alert("Update failed: " + data.message);
    }
  } catch (err) {
    console.error("Error updating appointment:", err);
  }
};


  if (loading) return <p>Loading patient details...</p>;

  return (
    <div className="container">
      <div className="m-2">
        <h3>Name: {details?.name || ""}</h3>
        <h3>Number: {details?.number || ""}</h3>
        <h3>Age: {details?.age || ""}</h3>
      </div>

      <button type="button" className="btn btn-primary m-2" data-bs-toggle="modal" data-bs-target="#editPatientModal">
        Edit Details
      </button>

      {/* Edit Patient Modal */}
      <div className="modal fade" id="editPatientModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5">Edit Patient Details</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input type="text" className="form-control" name="name" value={patient.name} onChange={handleChange} required />
                </div>
                <div className="mb-3">
                  <label className="form-label">Number</label>
                  <input type="number" className="form-control" name="number" value={patient.number} onChange={handleChange} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Age</label>
                  <input type="number" className="form-control" name="age" value={patient.age} onChange={handleChange} />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary" onClick={handleSave} data-bs-dismiss="modal">Save changes</button>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="mt-4">
        <h3>Previous Appointment Details</h3>
        {appointments.length === 0 ? (
          <p>No appointments found</p>
        ) : (
          <table className="table table-bordered mt-2">
            <thead>
              <tr>
                <th>Date</th>
                <th>Services</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, index) =>
                appt.visits?.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map((visit, vIndex) => (
                  <tr key={`${index}-${vIndex}`}>
                    <td>{visit.date ? new Date(visit.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "N/A"}</td>
                    <td>
                      {(visit.service || [])
                        .map((s) => (typeof s === "object" ? s.name : s))
                        .join(", ") || "N/A"}
                    </td>
                    <td>
                            {Array.isArray(visit.service)
                              ? visit.service.map(s => (typeof s === "object" ? s.name : s)).join(", ")
                              : typeof visit.service === "object"
                              ? visit.service.name
                              : visit.service || "N/A"}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-warning me-2" data-bs-toggle="modal" data-bs-target="#editAppointmentModal" onClick={() => handleEditAppt({ ...appt, visits: [visit] })}>Update</button>
                      <button className="btn btn-sm btn-danger">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Appointment Modal */}
      <div className="modal fade" id="editAppointmentModal" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5">Edit Appointment</h1>
              <button type="button" className="btn-close" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Date</label>
                  <input type="datetime-local" className="form-control" value={apptData.date} onChange={(e) => setApptData(prev => ({ ...prev, date: e.target.value }))} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Services</label>
                  <ServiceList onSelect={handleApptServiceChange} selectedServices={apptData.service} services={availableServices} />
                </div>
                                
                {apptData.service.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label">Bill Details</label>
                    <ul className="list-group mb-2">
                      {apptData.service.map((s, index) => (
                        <li key={s} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>{s}</span>
                          <input type="number" className="form-control w-25" value={apptServiceAmounts[index] ?? 0} onChange={(e) => {
                            const newAmounts = [...apptServiceAmounts];
                            newAmounts[index] = Number(e.target.value);
                            setApptServiceAmounts(newAmounts);
                            const total = newAmounts.reduce((a, b) => a + b, 0);
                            setApptData(prev => ({ ...prev, amount: total }));
                          }} />
                        </li>
                      ))}
                    </ul>
                    <label className="form-label">Total Amount</label>
                    <input type="number" className="form-control" value={apptData.amount} readOnly />
                  </div>
                )}
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" className="btn btn-primary" onClick={handleUpdateAppt} data-bs-dismiss="modal">Save changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
