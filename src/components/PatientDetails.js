import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ServiceList from "./ServiceList";

export default function PatientDetails() {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
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
    const [apptData, setApptData] = useState({
        date: "",
        service: [],
        amount: 0,
    });
    const [apptServiceAmounts, setApptServiceAmounts] = useState([]);

    const toISTDateTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const istOffset = 5.5 * 60;
        const istDate = new Date(date.getTime() + istOffset * 60000);
        return istDate.toISOString().slice(0, 10);
    };

    const fromISTToUTC = (istDate) => {
        if (!istDate) return null;
        const [year, month, day] = istDate.split("-").map(Number);
        return new Date(Date.UTC(year, month - 1, day));
    };

    const fetchServices = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
                headers: { "auth-token": token },
            });
            const data = await res.json();
            setAvailableServices(data);
        } catch (err) {
            console.error("Error fetching services:", err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const [patientRes, appointmentsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/patientdetails/${id}`, {
                    headers: { "auth-token": token },
                }),
                fetch(`${API_BASE_URL}/api/auth/appointments/${id}`, {
                    headers: { "auth-token": token },
                }),
            ]);

            const patientData = await patientRes.json();
            const appointmentsData = await appointmentsRes.json();

            setDetails(patientData);
            setPatient({
                name: patientData.name || "",
                service: patientData.service || [],
                number: patientData.number || "",
                age: patientData.age || "",
                amount: patientData.amount || 0,
            });
            setAppointments(appointmentsData);

            await fetchServices();
        } catch (err) {
            console.error("Error fetching patient data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handleChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    const handleSave = async () => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${API_BASE_URL}/api/auth/updatepatientdetails/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": token,
                    },
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

    const handleEditAppt = (appt) => {
        const visit = appt.visits?.[0] || {};
        setEditingAppt(appt);

        const serviceObjs = (visit.service || []).map((s) =>
            typeof s === "object"
                ? s
                : availableServices.find((svc) => svc._id === s) || {
                      name: s,
                      amount: 0,
                  }
        );

        const amounts = serviceObjs.map((s) => s.amount || 0);

        setApptServiceAmounts(amounts);
        setApptData({
            date: toISTDateTime(visit.date),
            service: serviceObjs,
            amount: amounts.reduce((a, b) => a + b, 0),
        });
    };

    const handleApptServiceChange = (serviceObj, checked) => {
        setApptData((prev) => {
            let updatedServices = [...prev.service];
            let updatedAmounts = [...apptServiceAmounts];

            const serviceId = serviceObj._id || serviceObj.id || serviceObj.name;

            if (checked) {
                const exists = updatedServices.find(
                    (s) => (s._id || s.id || s.name) === serviceId
                );
                if (!exists) {
                    updatedServices.push(serviceObj);
                    updatedAmounts.push(serviceObj.amount || 0);
                }
            } else {
                const index = updatedServices.findIndex(
                    (s) => (s._id || s.id || s.name) === serviceId
                );
                if (index > -1) {
                    updatedServices.splice(index, 1);
                    updatedAmounts.splice(index, 1);
                }
            }

            setApptServiceAmounts(updatedAmounts);
            return {
                ...prev,
                service: updatedServices,
                amount: updatedAmounts.reduce((a, b) => a + b, 0),
            };
        });
    };

    const handleUpdateAppt = async () => {
        if (!editingAppt) return;
        try {
            const token = localStorage.getItem("token");
            const appointmentId = editingAppt._id;
            const visitId = editingAppt.visits[0]._id;

            const response = await fetch(
                `${API_BASE_URL}/api/auth/updateappointment/${appointmentId}/${visitId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": token,
                    },
                    body: JSON.stringify({
                        date: fromISTToUTC(apptData.date),
                        service: apptData.service.map((s, i) => ({
                            id: s._id || s.id || null,
                            name: s.name,
                            amount: apptServiceAmounts[i] ?? s.amount ?? 0,
                        })),
                        amount: apptData.amount,
                    }),
                }
            );
            const data = await response.json();
            if (data.success) {
                alert("Appointment updated successfully!");
                fetchData();
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

            {/* Edit Patient Button */}
            <button
                type="button"
                className="btn btn-primary m-2"
                data-bs-toggle="modal"
                data-bs-target="#editPatientModal"
            >
                Edit Details
            </button>

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
                                appt.visits?.map((visit) => (
                                    <tr key={visit._id}>
                                        <td>
                                            {visit.date
                                                ? new Date(visit.date).toLocaleDateString(
                                                      "en-IN",
                                                      { dateStyle: "medium" }
                                                  )
                                                : "N/A"}
                                        </td>
                                        <td>
                                            {(visit.service || [])
                                                .map((s) =>
                                                    typeof s === "object"
                                                        ? s.name
                                                        : s
                                                )
                                                .join(", ") || "N/A"}
                                        </td>
                                        <td>
                                            {Array.isArray(visit.service)
                                                ? visit.service
                                                      .map((s) =>
                                                          typeof s === "object"
                                                              ? s.amount
                                                              : s
                                                      )
                                                      .reduce((a, b) => a + b, 0)
                                                : typeof visit.service === "object"
                                                ? visit.service.amount
                                                : visit.service || 0}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-warning me-2"
                                                data-bs-toggle="modal"
                                                data-bs-target="#editAppointmentModal"
                                                onClick={() =>
                                                    handleEditAppt({
                                                        ...appt,
                                                        visits: [visit],
                                                    })
                                                }
                                            >
                                                Update
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Edit Appointment Modal */}
            {editingAppt && (
                <div
                    className="modal fade show d-block"
                    id="editAppointmentModal"
                    tabIndex="-1"
                    aria-hidden="true"
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h1 className="modal-title fs-5">Edit Appointment</h1>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setEditingAppt(null)}
                                />
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={apptData.date}
                                        onChange={(e) =>
                                            setApptData((prev) => ({
                                                ...prev,
                                                date: e.target.value,
                                            }))
                                        }
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Services</label>
                                    <ServiceList
                                        selectedServices={apptData.service}
                                        services={availableServices}
                                        onSelect={handleApptServiceChange}
                                    />
                                </div>

                                {apptData.service.length > 0 && (
                                    <div className="mb-3">
                                        <label className="form-label">Bill Details</label>
                                        <ul className="list-group mb-2">
                                            {apptData.service.map((s, index) => (
                                                <li
                                                    key={s.id || s._id || index}
                                                    className="list-group-item d-flex justify-content-between align-items-center"
                                                >
                                                    <span>{s.name}</span>
                                                    <input
                                                        type="number"
                                                        className="form-control w-25"
                                                        value={apptServiceAmounts[index]}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            const newAmounts = [...apptServiceAmounts];
                                                            newAmounts[index] = val;
                                                            setApptServiceAmounts(newAmounts);

                                                            const updatedServices = [...apptData.service];
                                                            updatedServices[index].amount = val;
                                                            setApptData((prev) => ({
                                                                ...prev,
                                                                service: updatedServices,
                                                                amount: updatedServices.reduce(
                                                                    (a, b) => a + (b.amount || 0),
                                                                    0
                                                                ),
                                                            }));
                                                        }}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                        <label className="form-label">Total Amount</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={apptData.amount}
                                            readOnly
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setEditingAppt(null)}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleUpdateAppt}
                                >
                                    Save changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
