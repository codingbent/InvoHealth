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

    const [patient, setPatient] = useState({
        name: "",
        service: [],
        number: "",
        age: "",
        gender: "",
        amount: 0,
    });

    const [appointments, setAppointments] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [doctor, setDoctor] = useState(null);

    // ------------------------------------------------------------
    // FETCH DOCTOR DETAILS
    // ------------------------------------------------------------
    const fetchDoctor = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
                headers: { "auth-token": token },
            });
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error("Error fetching doctor:", err);
        }
    };

    // ------------------------------------------------------------
    // DATE HELPERS
    // ------------------------------------------------------------
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

    // ------------------------------------------------------------
    // FETCH SERVICES
    // ------------------------------------------------------------
    const fetchServices = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${API_BASE_URL}/api/auth/fetchallservice`,
                {
                    headers: { "auth-token": token },
                }
            );
            const data = await res.json();
            setAvailableServices(data);
        } catch (err) {
            console.error("Error fetching services:", err);
        }
    };

    // ------------------------------------------------------------
    // FETCH PATIENT + APPOINTMENTS
    // ------------------------------------------------------------
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
                gender: patientData.gender || "", // ✅ ADDED
                amount: patientData.amount || 0,
            });

            setAppointments(appointmentsData);
            await fetchServices();
        } catch (err) {
            console.error("Error fetching patient:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchDoctor();
    }, [id]);

    // ------------------------------------------------------------
    // UPDATE PATIENT DETAILS
    // ------------------------------------------------------------
    const handleChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    const handleSave = async () => {
        const num = patient.number;

        if (!/^\d{10}$/.test(num)) {
            alert("Enter a valid 10-digit number");
            return;
        }

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
                alert("Patient updated successfully");
                setDetails(patient);
            } else {
                alert(result.message || "Update failed");
            }
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    };

    // ------------------------------------------------------------
    // INVOICE GENERATOR  (unchanged)
    // ------------------------------------------------------------
    const generateInvoice = (appointmentId, visit, details) => {
        try {
            if (!doctor) {
                alert("Doctor details not loaded yet!");
                return;
            }

            const invoiceNumber = visit.invoiceNumber || "N/A";
            const docPdf = new jsPDF();
            const pageWidth = docPdf.internal.pageSize.getWidth();
            let y = 20;

            docPdf.setFontSize(16);
            docPdf.text(doctor.clinicName, 20, y);
            y += 8;

            docPdf.setFontSize(12);
            docPdf.text(doctor.address.line1, 20, y);
            y += 6;
            docPdf.text(
                `${doctor.address.city}, ${doctor.address.state} - ${doctor.address.pincode}`,
                20,
                y
            );
            y += 6;

            if (doctor.gstNumber) {
                docPdf.text(`GST: ${doctor.gstNumber}`, 20, y);
                y += 6;
            }

            // Doctor Right Side
            docPdf.setFontSize(14);
            docPdf.text(doctor.name, pageWidth - 20, 20, { align: "right" });

            // Patient Info
            y += 12;
            docPdf.text(`Invoice No: INV-${invoiceNumber}`, 20, y);
            y += 8;
            docPdf.text(`Patient: ${details.name}`, 20, y);
            y += 6;
            docPdf.text(`Gender: ${details.gender || "N/A"}`, 20, y); // ✅ SHOW GENDER ON INVOICE
            y += 6;
            docPdf.text(`Phone: ${details.number}`, 20, y);
            y += 6;
            docPdf.text(`Age: ${details.age}`, 20, y);
            y += 6;
            docPdf.text(
                `Date: ${new Date(visit.date).toLocaleDateString("en-IN")}`,
                20,
                y
            );
            y += 8;

            autoTable(docPdf, {
                startY: y,
                head: [["Service", "Amount"]],
                body: (visit.service || []).map((s) => [
                    typeof s === "object" ? s.name : s,
                    typeof s === "object" ? s.amount : Number(s),
                ]),
            });

            const finalY = docPdf.lastAutoTable.finalY + 10;

            const total = (visit.service || []).reduce(
                (sum, s) =>
                    sum + (typeof s === "object" ? s.amount : Number(s)),
                0
            );

            docPdf.text(`Total: ₹${total}`, pageWidth - 20, finalY, {
                align: "right",
            });

            docPdf.save(`Invoice_${details.name}.pdf`);
        } catch (err) {
            console.error(err);
        }
    };

    const editInvoice = (appointmentId, visit, details) => {
        setEditingAppt({ ...visit, appointmentId });

        setApptData({
            date: visit.date?.slice(0, 10),
            service: visit.service || [],
            amount: visit.amount,
            payment_type: visit.payment_type,
        });

        const serviceAmounts = (visit.service || []).map((s) => s.amount || 0);
        setApptServiceAmounts(serviceAmounts);

        // OPEN MODAL
        document.getElementById("editAppointmentModalBtn").click();
    };

    const handleUpdateAppt = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API_BASE_URL}/api/auth/edit-invoice/${editingAppt.appointmentId}/${editingAppt._id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": token,
                    },
                    body: JSON.stringify({
                        date: apptData.date,
                        service: apptData.service,
                        amount: apptData.amount,
                        payment_type: apptData.payment_type,
                    }),
                }
            );

            const data = await response.json();

            if (data.success) {
                alert("Invoice updated successfully!");
                fetchData();
            } else {
                alert("Update failed: " + data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const deleteInvoice = async (appointmentId, visit) => {
        if (!window.confirm("Delete this invoice?")) return;

        try {
            const token = localStorage.getItem("token");

            const response = await fetch(
                `${API_BASE_URL}/api/auth/delete-invoice/${appointmentId}/${visit._id}`,
                {
                    method: "DELETE",
                    headers: {
                        "auth-token": token,
                    },
                }
            );

            const data = await response.json();

            if (data.success) {
                alert("Invoice deleted!");
                fetchData();
            } else {
                alert("Delete failed: " + data.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <p>Loading patient details...</p>;

    return (
        <>
            <button
                id="editAppointmentModalBtn"
                style={{ display: "none" }}
                data-bs-toggle="modal"
                data-bs-target="#editAppointmentModal"
            ></button>
            <div className="container">
                <div className="m-2">
                    <h3>Name: {details?.name}</h3>
                    <h3>Number: {details?.number}</h3>
                    <h3>Age: {details?.age}</h3>
                    <h3>Gender: {details?.gender || "N/A"}</h3>{" "}
                    {/* ✅ SHOW GENDER */}
                </div>

                <button
                    className="btn btn-primary m-2"
                    data-bs-toggle="modal"
                    data-bs-target="#editPatientModal"
                >
                    Edit Details
                </button>

                {/* ----------------------------------------------------------
                PREVIOUS APPOINTMENTS TABLE
            ----------------------------------------------------------- */}
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
                                    <th>Payment</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {appointments.map((appt) =>
                                    appt.visits
                                        .slice()
                                        .sort(
                                            (a, b) =>
                                                new Date(b.date) -
                                                new Date(a.date)
                                        )
                                        .map((visit) => (
                                            <tr>
                                                <td>
                                                    {new Date(
                                                        visit.date
                                                    ).toLocaleDateString(
                                                        "en-IN"
                                                    )}
                                                </td>
                                                <td>
                                                    {(visit.service || [])
                                                        .map((s) =>
                                                            typeof s ===
                                                            "object"
                                                                ? s.name
                                                                : s
                                                        )
                                                        .join(", ")}
                                                </td>
                                                <td>
                                                    {(
                                                        visit.service || []
                                                    ).reduce(
                                                        (sum, s) =>
                                                            sum +
                                                            (typeof s ===
                                                            "object"
                                                                ? s.amount
                                                                : Number(s)),
                                                        0
                                                    )}
                                                </td>
                                                <td>
                                                    {visit.payment_type ||
                                                        "N/A"}
                                                </td>
                                                <td>
                                                    <div className="dropdown">
                                                        <button
                                                            className="btn btn-primary dropdown-toggle"
                                                            type="button"
                                                            data-bs-toggle="dropdown"
                                                            aria-expanded="false"
                                                        >
                                                            Actions
                                                        </button>

                                                        <ul className="dropdown-menu">
                                                            <li>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() =>
                                                                        generateInvoice(
                                                                            appt._id,
                                                                            visit,
                                                                            details
                                                                        )
                                                                    }
                                                                >
                                                                    Invoice
                                                                </button>
                                                            </li>

                                                            <li>
                                                                <button
                                                                    className="dropdown-item"
                                                                    onClick={() =>
                                                                        editInvoice(
                                                                            appt._id,
                                                                            visit,
                                                                            details
                                                                        )
                                                                    }
                                                                >
                                                                    Edit
                                                                </button>
                                                            </li>

                                                            <li>
                                                                <button
                                                                    className="dropdown-item text-danger"
                                                                    onClick={() =>
                                                                        deleteInvoice(
                                                                            appt._id,
                                                                            visit,
                                                                            details
                                                                        )
                                                                    }
                                                                >
                                                                    Delete
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ----------------------------------------------------------
                EDIT PATIENT DETAILS MODAL
            ----------------------------------------------------------- */}
                <div
                    className="modal fade"
                    id="editPatientModal"
                    tabIndex="-1"
                    aria-hidden="true"
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h1 className="modal-title fs-5">
                                    Edit Patient Details
                                </h1>
                                <button
                                    type="button"
                                    className="btn-close"
                                    data-bs-dismiss="modal"
                                />
                            </div>

                            <div className="modal-body">
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Name
                                        </label>
                                        <input
                                            className="form-control"
                                            name="name"
                                            value={patient.name}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Number
                                        </label>
                                        <input
                                            className="form-control"
                                            name="number"
                                            value={patient.number}
                                            onChange={(e) => {
                                                if (
                                                    /^\d*$/.test(e.target.value)
                                                )
                                                    handleChange(e);
                                            }}
                                            maxLength={10}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label">
                                            Age
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            name="age"
                                            value={patient.age}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    {/* ✅ GENDER DROPDOWN */}
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Gender
                                        </label>
                                        <select
                                            className="form-select"
                                            name="gender"
                                            value={patient.gender}
                                            onChange={handleChange}
                                        >
                                            <option value="">
                                                Select Gender
                                            </option>
                                            <option value="Male">Male</option>
                                            <option value="Female">
                                                Female
                                            </option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </form>
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
                                    onClick={handleSave}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
