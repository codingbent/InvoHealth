import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ServiceList from "./ServiceList";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PatientDetails() {
    const { id } = useParams();

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [details, setDetails] = useState(null);
    const [appointments, setAppointments] = useState([]); // ✅ VISITS ARRAY
    const [availableServices, setAvailableServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [editingVisit, setEditingVisit] = useState(null);

    const [apptData, setApptData] = useState({
        date: "",
        service: [],
        payment_type: "",
        discount: 0,
        isPercent: false,
    });

    // ------------------------------------------------------------
    // FETCH DATA
    // ------------------------------------------------------------
    const fetchData = async () => {
        try {
            const token = localStorage.getItem("token");

            const [patientRes, visitsRes, servicesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/auth/patientdetails/${id}`, {
                    headers: { "auth-token": token },
                }),
                fetch(`${API_BASE_URL}/api/auth/appointments/${id}`, {
                    headers: { "auth-token": token },
                }),
                fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
                    headers: { "auth-token": token },
                }),
            ]);

            const patientData = await patientRes.json();
            const visitsData = await visitsRes.json();
            const servicesData = await servicesRes.json();

            setDetails(patientData);
            setAppointments(visitsData || []);
            setAvailableServices(servicesData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [id]);

    // ------------------------------------------------------------
    // EDIT VISIT
    // ------------------------------------------------------------
    const editInvoice = (visit) => {
        setEditingVisit(visit);

        setApptData({
            date: visit.date?.slice(0, 10),
            service: visit.service || [],
            payment_type: visit.payment_type || "",
            discount: visit.discount || 0,
            isPercent: !!visit.isPercent,
        });

        document.getElementById("editAppointmentModalBtn").click();
    };

    const handleUpdateAppt = async () => {
        try {
            const token = localStorage.getItem("token");

            const res = await fetch(
                `${API_BASE_URL}/api/auth/edit-invoice/${editingVisit.appointmentId}/${editingVisit._id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": token,
                    },
                    body: JSON.stringify(apptData),
                }
            );

            const data = await res.json();
            if (data.success) {
                alert("Invoice updated");
                fetchData();
            } else {
                alert("Update failed");
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ------------------------------------------------------------
    // DELETE VISIT
    // ------------------------------------------------------------
    const deleteInvoice = async (visit) => {
        if (!window.confirm("Delete this invoice?")) return;

        try {
            const token = localStorage.getItem("token");

            const res = await fetch(
                `${API_BASE_URL}/api/auth/delete-invoice/${visit.appointmentId}/${visit._id}`,
                {
                    method: "DELETE",
                    headers: { "auth-token": token },
                }
            );

            const data = await res.json();
            if (data.success) {
                alert("Deleted");
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <p>Loading...</p>;
    if (!details) return <p>Patient not found</p>;

    return (
        <>
            <button
                id="editAppointmentModalBtn"
                data-bs-toggle="modal"
                data-bs-target="#editAppointmentModal"
                style={{ display: "none" }}
            />

            <div className="container mt-3">
                <h3>{details.name}</h3>
                <p>
                    {details.gender} | Age: {details.age}
                </p>

                <h4 className="mt-4">Appointments</h4>

                {appointments.length === 0 ? (
                    <p>No appointments</p>
                ) : (
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Services</th>
                                <th>Amount</th>
                                <th>Payment</th>
                                <th>Actions</th>
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
                                                .map((s) =>
                                                    typeof s === "object"
                                                        ? s.name
                                                        : s
                                                )
                                                .join(", ")}
                                        </td>
                                        <td>{visit.amount}</td>
                                        <td>
                                            {visit.payment_type || "N/A"}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-sm btn-primary me-1"
                                                onClick={() =>
                                                    editInvoice(visit)
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() =>
                                                    deleteInvoice(visit)
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
            </div>

            {/* EDIT MODAL */}
            <div
                className="modal fade"
                id="editAppointmentModal"
                tabIndex="-1"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5>Edit Appointment</h5>
                            <button
                                className="btn-close"
                                data-bs-dismiss="modal"
                            />
                        </div>

                        <div className="modal-body">
                            <label>Date</label>
                            <input
                                type="date"
                                className="form-control mb-2"
                                value={apptData.date}
                                onChange={(e) =>
                                    setApptData((p) => ({
                                        ...p,
                                        date: e.target.value,
                                    }))
                                }
                            />

                            <label>Payment</label>
                            <select
                                className="form-select mb-2"
                                value={apptData.payment_type}
                                onChange={(e) =>
                                    setApptData((p) => ({
                                        ...p,
                                        payment_type: e.target.value,
                                    }))
                                }
                            >
                                <option value="">Select</option>
                                <option>Cash</option>
                                <option>Card</option>
                                <option>UPI</option>
                                <option>ICICI</option>
                                <option>HDFC</option>
                            </select>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Close
                            </button>
                            <button
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={handleUpdateAppt}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}