import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function PatientDetails() {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const [patient, setPatient] = useState({
    name: "",
    service: [],
    number: "",
    age: "",
    amount: "",
  });
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch patient details and appointments together
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientRes, appointmentsRes] = await Promise.all([
          fetch(`http://localhost:5001/api/auth/patientdetails/${id}`),
          fetch(`http://localhost:5001/api/auth/appointments/${id}`),
        ]);

        const patientData = await patientRes.json();
        const appointmentsData = await appointmentsRes.json();

        setDetails(patientData);
        setPatient({
          name: patientData.name || "",
          service: patientData.service || [],
          number: patientData.number || "",
          age: patientData.age || "",
          amount: patientData.amount || "",
        });
        setAppointments(appointmentsData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    setPatient({ ...patient, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/auth/updatepatientdetails/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patient),
        }
      );

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

  if (loading) return <p>Loading patient details...</p>;

  return (
    <div className="container">
      <div className="m-2">
        <h3>Name: {details.name}</h3>
        <h3>Number: {details.number}</h3>
        <h3>Age: {details.age}</h3>
      </div>

      <button
        type="button"
        className="btn btn-primary m-2"
        data-bs-toggle="modal"
        data-bs-target="#editPatientModal"
      >
        Edit Details
      </button>

      {/* Edit Modal */}
      <div
        className="modal fade"
        id="editPatientModal"
        tabIndex="-1"
        aria-labelledby="editPatientLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="editPatientLabel">
                Edit Patient Details
              </h1>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>

            <div className="modal-body">
              <form>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Name"
                    name="name"
                    value={patient.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Number (10 digits)"
                    name="number"
                    value={patient.number}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Age</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter Age"
                    name="age"
                    value={patient.age}
                    onChange={handleChange}
                  />
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                data-bs-dismiss="modal"
              >
                Save changes
              </button>
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
              </tr>
            </thead>
            <tbody>
                {appointments.map((appt, index) => {
                    const visit = appt.visits && appt.visits[0]; // first visit
                    return (
                    <tr key={index}>
                        <td>
                        {visit && visit.date
                            ? new Date(visit.date).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                            })
                            : "N/A"}
                        </td>
                        <td>{visit && Array.isArray(visit.service) ? visit.service.join(", ") : "N/A"}</td>
                        <td>{visit?.amount ?? "N/A"}</td>
                    </tr>
                    );
                })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
