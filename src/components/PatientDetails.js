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

    const { id: patientId } = useParams();

    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
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
        amount: 0,
        payment_type: "",
        discount: 0,
        isPercent: false,
    });
    const [apptServiceAmounts, setApptServiceAmounts] = useState([]);

    /* ================= FETCH ================= */

    const authHeader = {
        "auth-token": localStorage.getItem("token"),
    };

    const fetchDoctor = async () => {
        const res = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
            headers: authHeader,
        });
        const data = await res.json();
        if (data.success) setDoctor(data.doctor);
    };

    const fetchServices = async () => {
        const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
            headers: authHeader,
        });
        setAvailableServices(await res.json());
    };

    const fetchData = async () => {
        setLoading(true);
        const [pRes, aRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/auth/patientdetails/${patientId}`, {
                headers: authHeader,
            }),
            fetch(`${API_BASE_URL}/api/auth/appointments/${patientId}`, {
                headers: authHeader,
            }),
        ]);

        const patientData = await pRes.json();
        const apptData = await aRes.json();

        setDetails(patientData);
        setPatient({
            name: patientData.name || "",
            number: patientData.number || "",
            age: patientData.age || "",
            gender: patientData.gender || "",
        });

        setAppointments(apptData || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        fetchDoctor();
        fetchServices();
    }, [patientId]);

    /* ================= PATIENT ================= */

    const handlePatientChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    const savePatient = async () => {
        await fetch(
            `${API_BASE_URL}/api/auth/updatepatientdetails/${patientId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeader,
                },
                body: JSON.stringify(patient),
            }
        );
        fetchData();
    };

    /* ================= APPOINTMENT ================= */

    const openEditAppointment = (appointmentId, visit) => {
        setEditingAppt({ appointmentId, visitId: visit._id });

        setApptData({
            date: visit.date.slice(0, 10),
            service: visit.service || [],
            payment_type: visit.payment_type || "",
            discount: visit.discount || 0,
            isPercent: !!visit.isPercent,
        });

        setApptServiceAmounts(
            (visit.service || []).map((s) => Number(s.amount) || 0)
        );

        document.getElementById("editAppointmentBtn").click();
    };

    const updateAppointment = async () => {
        if (!editingAppt) return;

        const res = await fetch(
            `${API_BASE_URL}/api/auth/edit-invoice/${editingAppt.appointmentId}/${editingAppt.visitId}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...authHeader,
                },
                body: JSON.stringify(apptData),
            }
        );

        const data = await res.json();
        if (data.success) fetchData();
        else alert(data.message);
    };

    const deleteAppointment = async (appointmentId, visitId) => {
        if (!window.confirm("Delete invoice?")) return;

        await fetch(
            `${API_BASE_URL}/api/auth/delete-invoice/${appointmentId}/${visitId}`,
            { method: "DELETE", headers: authHeader }
        );
        fetchData();
    };

    /* ================= INVOICE ================= */

    const generateInvoice = (visit) => {
        if (!doctor) return;

        const doc = new jsPDF();
        doc.text(doctor.clinicName, 15, 15);
        doc.text(`Doctor: ${doctor.name}`, 15, 25);
        doc.text(`Patient: ${details.name}`, 15, 35);
        doc.text(
            `Date: ${new Date(visit.date).toLocaleDateString("en-IN")}`,
            15,
            45
        );

        autoTable(doc, {
            startY: 55,
            head: [["Service", "Amount"]],
            body: visit.service.map((s) => [s.name, s.amount]),
        });

        doc.save(`Invoice_${details.name}.pdf`);
    };

    if (loading) return <p>Loading...</p>;

    /* ================= UI ================= */

    return (
        <>
            <button
                id="editAppointmentBtn"
                style={{ display: "none" }}
                data-bs-toggle="modal"
                data-bs-target="#editAppointmentModal"
            />

            <div className="container mt-3">
                <h3>{details.name}</h3>
                <p>{details.number}</p>
                <p>
                    Age: {details.age} | Gender: {details.gender}
                </p>

                <h4 className="mt-4">Appointments</h4>

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
                        {appointments.map((appt) => (
                            <tr key={appt._id}>
                                <td>
                                    {new Date(appt.date).toLocaleDateString(
                                        "en-IN"
                                    )}
                                </td>
                                <td>
                                    {appt.service.map((s) => s.name).join(", ")}
                                </td>
                                <td>{appt.amount}</td>
                                <td>{appt.payment_type}</td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-primary me-1"
                                        onClick={() => generateInvoice(appt)}
                                    >
                                        Invoice
                                    </button>
                                    <button
                                        className="btn btn-sm btn-warning me-1"
                                        onClick={() =>
                                            openEditAppointment(
                                                appt.appointmentId || appt._id,
                                                appt
                                            )
                                        }
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() =>
                                            deleteAppointment(
                                                appt.appointmentId || appt._id,
                                                appt._id
                                            )
                                        }
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ================= EDIT APPOINTMENT MODAL ================= */}
            <div className="modal fade" id="editAppointmentModal">
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
                            <input
                                type="date"
                                className="form-control mb-2"
                                value={apptData.date}
                                onChange={(e) =>
                                    setApptData({
                                        ...apptData,
                                        date: e.target.value,
                                    })
                                }
                            />

                            <ServiceList
                                services={availableServices}
                                selectedServices={apptData.service}
                                onSelect={(s, checked) => {
                                    let services = [...apptData.service];
                                    let amounts = [...apptServiceAmounts];

                                    if (checked) {
                                        services.push(s);
                                        amounts.push(s.amount);
                                    } else {
                                        const i = services.findIndex(
                                            (x) => x.name === s.name
                                        );
                                        services.splice(i, 1);
                                        amounts.splice(i, 1);
                                    }

                                    setApptServiceAmounts(amounts);
                                    setApptData({
                                        ...apptData,
                                        service: services,
                                        amount: amounts.reduce(
                                            (a, b) => a + b,
                                            0
                                        ),
                                    });
                                }}
                            />

                            <select
                                className="form-select mt-2"
                                value={apptData.payment_type}
                                onChange={(e) =>
                                    setApptData({
                                        ...apptData,
                                        payment_type: e.target.value,
                                    })
                                }
                            >
                                <option value="">Select Payment</option>
                                <option value="Cash">Cash</option>
                                <option value="Card">Card</option>
                                <option value="UPI">UPI</option>
                                <option value="ICICI">ICICI</option>
                                <option value="HDFC">HDFC</option>
                            </select>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={updateAppointment}
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