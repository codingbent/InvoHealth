import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ServiceList from "./ServiceList";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PatientDetails() {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const { id } = useParams();

    const [details, setDetails] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [doctor, setDoctor] = useState(null);

    const [patient, setPatient] = useState({
        name: "",
        number: "",
        age: "",
        gender: "",
    });

    const [editingAppt, setEditingAppt] = useState(null);
    const [apptData, setApptData] = useState({
        date: "",
        service: [],
        payment_type: "",
        discount: 0,
        isPercent: false,
    });

    const [apptServiceAmounts, setApptServiceAmounts] = useState([]);

    // ================= FETCH DOCTOR =================
    const fetchDoctor = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
                headers: { "auth-token": localStorage.getItem("token") },
            });
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error(err);
        }
    };

    // ================= FETCH SERVICES =================
    const fetchServices = async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/auth/fetchallservice`,
                { headers: { "auth-token": localStorage.getItem("token") } }
            );
            const data = await res.json();
            setAvailableServices(Array.isArray(data) ? data : []);
        } catch {
            setAvailableServices([]);
        }
    };

    // ================= FETCH PATIENT + VISITS =================
    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");

            const [pRes, aRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/patientdetails/${id}`, {
                    headers: { "auth-token": token },
                }),
                fetch(`${API_BASE_URL}/api/auth/appointments/${id}`, {
                    headers: { "auth-token": token },
                }),
            ]);

            const patientData = await pRes.json();
            const visits = await aRes.json();

            setDetails(patientData);
            setPatient({
                name: patientData.name || "",
                number: patientData.number || "",
                age: patientData.age || "",
                gender: patientData.gender || "",
            });

            setAppointments(Array.isArray(visits) ? visits : []);
            await fetchServices();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchDoctor();
        // eslint-disable-next-line
    }, [id]);

    // ================= UPDATE PATIENT =================
    const handleSave = async () => {
        if (!/^\d{10}$/.test(patient.number)) {
            alert("Invalid mobile number");
            return;
        }

        await fetch(`${API_BASE_URL}/api/auth/updatepatientdetails/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "auth-token": localStorage.getItem("token"),
            },
            body: JSON.stringify(patient),
        });

        fetchData();
    };

    // ================= DELETE INVOICE =================
    const deleteInvoice = async (visitId) => {
        if (!window.confirm("Delete this invoice?")) return;

        await fetch(
            `${API_BASE_URL}/api/auth/delete-invoice/${id}/${visitId}`,
            {
                method: "DELETE",
                headers: { "auth-token": localStorage.getItem("token") },
            }
        );

        fetchData();
    };

    if (loading) return <p>Loading...</p>;

    // ================= UI =================
    return (
        <div className="container">
            <h3>Name: {details?.name}</h3>
            <h3>Number: {details?.number}</h3>
            <h3>Age: {details?.age}</h3>
            <h3>Gender: {details?.gender}</h3>

            {/* 🔥 KEEP EDIT PATIENT BUTTON */}
            <button
                className="btn btn-primary my-2"
                data-bs-toggle="modal"
                data-bs-target="#editPatientModal"
            >
                Edit Patient
            </button>

            <h4 className="mt-4">Appointments</h4>

            {appointments.length === 0 ? (
                <p>No appointments found</p>
            ) : (
                <table className="table table-bordered">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Services</th>
                            <th>Amount</th>
                            <th>Payment</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments
                            .slice()
                            .sort(
                                (a, b) =>
                                    new Date(b.date) - new Date(a.date)
                            )
                            .map((visit) => (
                                <tr key={visit._id}>
                                    <td>
                                        {new Date(
                                            visit.date
                                        ).toLocaleDateString("en-IN")}
                                    </td>
                                    <td>
                                        {(visit.service || [])
                                            .map((s) => s.name)
                                            .join(", ")}
                                    </td>
                                    <td>{visit.amount}</td>
                                    <td>{visit.payment_type || "N/A"}</td>
                                    <td>
                                        <button
                                            className="btn btn-danger btn-sm"
                                            onClick={() =>
                                                deleteInvoice(visit._id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            )}

            {/* ================= EDIT PATIENT MODAL ================= */}
            <div
                className="modal fade"
                id="editPatientModal"
                tabIndex="-1"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5>Edit Patient</h5>
                            <button
                                className="btn-close"
                                data-bs-dismiss="modal"
                            />
                        </div>
                        <div className="modal-body">
                            <input
                                className="form-control mb-2"
                                value={patient.name}
                                onChange={(e) =>
                                    setPatient({
                                        ...patient,
                                        name: e.target.value,
                                    })
                                }
                            />
                            <input
                                className="form-control mb-2"
                                value={patient.number}
                                onChange={(e) =>
                                    setPatient({
                                        ...patient,
                                        number: e.target.value,
                                    })
                                }
                            />
                            <input
                                className="form-control mb-2"
                                value={patient.age}
                                onChange={(e) =>
                                    setPatient({
                                        ...patient,
                                        age: e.target.value,
                                    })
                                }
                            />
                            <select
                                className="form-select"
                                value={patient.gender}
                                onChange={(e) =>
                                    setPatient({
                                        ...patient,
                                        gender: e.target.value,
                                    })
                                }
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={handleSave}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}