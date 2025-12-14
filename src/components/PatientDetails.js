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
    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);

    // ---------------- PATIENT EDIT ----------------
    const [patient, setPatient] = useState({
        name: "",
        number: "",
        age: "",
        gender: "",
    });

    // ---------------- APPOINTMENT EDIT ----------------
    const [editingVisit, setEditingVisit] = useState(null);
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
        const res = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
            headers: { "auth-token": localStorage.getItem("token") },
        });
        const data = await res.json();
        if (data.success) setDoctor(data.doctor);
    };

    // ================= FETCH SERVICES =================
    const fetchServices = async () => {
        const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
            headers: { "auth-token": localStorage.getItem("token") },
        });
        const data = await res.json();
        setAvailableServices(Array.isArray(data) ? data : []);
    };

    // ================= FETCH DATA =================
    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem("token");

        const [pRes, vRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/auth/patientdetails/${id}`, {
                headers: { "auth-token": token },
            }),
            fetch(`${API_BASE_URL}/api/auth/appointments/${id}`, {
                headers: { "auth-token": token },
            }),
        ]);

        const patientData = await pRes.json();
        const visits = await vRes.json();

        setDetails(patientData);
        setPatient({
            name: patientData.name || "",
            number: patientData.number || "",
            age: patientData.age || "",
            gender: patientData.gender || "",
        });

        setAppointments(Array.isArray(visits) ? visits : []);
        await fetchServices();
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        fetchDoctor();
        // eslint-disable-next-line
    }, [id]);

    // ================= SAVE PATIENT =================
    const handleSavePatient = async () => {
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

    // ================= DELETE VISIT =================
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

    // ================= INVOICE PDF =================
    const generateInvoice = (appointmentId, visit, details) => {
        try {
            if (!doctor) {
                alert("Doctor details not loaded yet!");
                return;
            }

            const margin = 20;
            const invoiceNumber = visit.invoiceNumber || "N/A";
            const docPdf = new jsPDF();

            const pageWidth = docPdf.internal.pageSize.getWidth();
            const pageHeight = docPdf.internal.pageSize.getHeight();

            let leftY = 20;
            let rightY = 20;

            // --------------------------------------------------
            // LEFT SECTION (Doctor & Patient Info)
            // --------------------------------------------------

            // Clinic Name
            docPdf.setFontSize(16);
            docPdf.text(doctor.clinicName, margin, leftY);
            leftY += 10;

            // Doctor Name
            docPdf.setFontSize(14);
            docPdf.text(doctor.name, margin, leftY);
            leftY += 8;

            // Degree
            docPdf.setFontSize(11);
            if (doctor.degree?.length) {
                docPdf.text(
                    `Degree: ${doctor.degree.join(", ")}`,
                    margin,
                    leftY
                );
                leftY += 6;
            }

            // Registration Number
            if (doctor.regNumber) {
                docPdf.text(`Reg No: ${doctor.regNumber}`, margin, leftY);
                leftY += 6;
            }

            // Invoice Number
            docPdf.text(`Invoice No: INV-${invoiceNumber}`, margin, leftY);
            leftY += 8;

            // Patient Info
            docPdf.text(
                `Patient: ${details.name} | Age: ${
                    details.age || "N/A"
                } | Gender: ${details.gender || "N/A"}`,
                margin,
                leftY
            );
            leftY += 10;

            // --------------------------------------------------
            // RIGHT SECTION (Address + Phone + Date)
            // --------------------------------------------------

            docPdf.setFontSize(10.5);

            if (doctor.address.line1) {
                docPdf.text(doctor.address.line1, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }
            if (doctor.address.line2) {
                docPdf.text(doctor.address.line2, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }

            docPdf.text(
                `${doctor.address.city}, ${doctor.address.state} - ${doctor.address.pincode}`,
                pageWidth - margin,
                rightY,
                { align: "right" }
            );
            rightY += 5;

            if (doctor.phone) {
                docPdf.text(
                    `Phone: ${doctor.phone}`,
                    pageWidth - margin,
                    rightY,
                    { align: "right" }
                );
                rightY += 5;
            }

            docPdf.text(
                `Date: ${new Date(visit.date).toLocaleDateString("en-IN")}`,
                pageWidth - margin,
                rightY,
                { align: "right" }
            );

            // --------------------------------------------------
            // TABLE
            // --------------------------------------------------

            const tableStartY = Math.max(leftY, rightY) + 10;

            autoTable(docPdf, {
                startY: tableStartY,
                // head: [["Service", "Amount (₹)"]],
                head: [["Service", "Amount (Rs.)"]],
                body: (visit.service || []).map((s) => [
                    typeof s === "object" ? s.name : s,
                    typeof s === "object" ? s.amount : Number(s),
                ]),
                // theme: "grid", // keeps borders
                // headStyles: {
                //     fillColor: null, // ❌ remove grey background
                //     textColor: 0, // black text
                //     fontStyle: "bold", // header bold
                // },
                // styles: {
                //     fontSize: 12,
                //     cellPadding: 4,
                //     lineColor: [0, 0, 0],
                //     lineWidth: 0.2,
                // },
                theme: "grid",
                styles: { fontSize: 11, cellPadding: 3 },
                headStyles: { fillColor: [0,0,0] },
            });

            const afterTableY = docPdf.lastAutoTable.finalY + 8;

            // --------------------------------------------------
            // FOOTER TEXT (RECEIVED MESSAGE)
            // --------------------------------------------------

            docPdf.setFontSize(11);

            const total = (visit.service || []).reduce(
                (sum, s) =>
                    sum + (typeof s === "object" ? s.amount : Number(s)),
                0
            );

            docPdf.text(
                `Received with thanks from ${details.name} the sum of Rupees ${total} on account of services.`,
                margin,
                afterTableY
            );

            // --------------------------------------------------
            // FIXED STAMP AREA AT BOTTOM RIGHT (ALWAYS)
            // --------------------------------------------------

            docPdf.setFontSize(12);

            // Doctor Name (1st line)
            docPdf.text(doctor.name, pageWidth - margin, pageHeight - 25, {
                align: "right",
            });

            // Degrees (2nd line, supports multiple degrees)
            if (doctor.degree && doctor.degree.length > 0) {
                docPdf.text(
                    doctor.degree.join(", "),
                    pageWidth - margin,
                    pageHeight - 18,
                    { align: "right" }
                );
            }

            // --------------------------------------------------
            // SAVE PDF
            // --------------------------------------------------

            docPdf.save(`Invoice_${details.name}.pdf`);
        } catch (err) {
            console.error(err);
        }
    };

    // ================= EDIT VISIT =================
    const openEditVisit = (visit) => {
        setEditingVisit(visit);

        const normalizedServices = visit.service.map(
            (s) => availableServices.find((x) => x.name === s.name) || s
        );

        setApptData({
            date: visit.date.slice(0, 10),
            service: normalizedServices,
            payment_type: visit.payment_type,
            discount: visit.discount || 0,
            isPercent: !!visit.isPercent,
        });

        setApptServiceAmounts(normalizedServices.map((s) => s.amount || 0));

        document.getElementById("editAppointmentBtn").click();
    };

    const updateVisit = async () => {
        await fetch(
            `${API_BASE_URL}/api/auth/edit-invoice/${id}/${editingVisit._id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": localStorage.getItem("token"),
                },
                body: JSON.stringify(apptData),
            }
        );

        fetchData();
    };

    if (loading) return <p>Loading...</p>;

    // ================= UI =================
    return (
        <div className="container">
            <h3>Name: {details.name}</h3>
            <h3>Number: {details.number}</h3>
            <h3>Age: {details.age}</h3>
            <h3>Gender: {details.gender}</h3>

            {/* EDIT PATIENT */}
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
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {appointments.map((visit) => (
                            <tr key={visit._id}>
                                <td>
                                    {new Date(visit.date).toLocaleDateString(
                                        "en-IN"
                                    )}
                                </td>
                                <td>
                                    {visit.service
                                        .map((s) => s.name)
                                        .join(", ")}
                                </td>
                                <td>{visit.amount}</td>
                                <td>{visit.payment_type}</td>
                                <td>
                                    <div className="dropdown">
                                        <button
                                            className="btn btn-primary btn-sm dropdown-toggle"
                                            data-bs-toggle="dropdown"
                                        >
                                            Actions
                                        </button>
                                        <ul className="dropdown-menu">
                                            <li>
                                                <button
                                                    className="dropdown-item"
                                                    onClick={() =>
                                                        generateInvoice(visit)
                                                    }
                                                >
                                                    Invoice
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    className="dropdown-item"
                                                    onClick={() =>
                                                        openEditVisit(visit)
                                                    }
                                                >
                                                    Edit
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    className="dropdown-item text-danger"
                                                    onClick={() =>
                                                        deleteInvoice(visit._id)
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* ================= HIDDEN MODAL TRIGGER ================= */}
            <button
                id="editAppointmentBtn"
                data-bs-toggle="modal"
                data-bs-target="#editAppointmentModal"
                style={{ display: "none" }}
            />

            {/* ================= EDIT PATIENT MODAL ================= */}
            {/* (same as your current one – already correct) */}

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
                            <ServiceList
                                services={availableServices}
                                selectedServices={apptData.service}
                                onSelect={(s, checked) => {
                                    let list = [...apptData.service];
                                    if (checked) list.push(s);
                                    else
                                        list = list.filter(
                                            (x) => x.name !== s.name
                                        );
                                    setApptData({ ...apptData, service: list });
                                }}
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={updateVisit}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div
                className="modal fade"
                id="editPatientModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        {/* HEADER */}
                        <div className="modal-header">
                            <h5 className="modal-title">
                                Edit Patient Details
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"
                            ></button>
                        </div>

                        {/* BODY */}
                        <div className="modal-body">
                            {/* NAME */}
                            <div className="mb-3">
                                <label className="form-label">
                                    Patient Name
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={patient.name}
                                    onChange={(e) =>
                                        setPatient({
                                            ...patient,
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            {/* MOBILE NUMBER */}
                            <div className="mb-3">
                                <label className="form-label">
                                    Mobile Number
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={patient.number}
                                    maxLength={10}
                                    onChange={(e) => {
                                        if (/^\d*$/.test(e.target.value)) {
                                            setPatient({
                                                ...patient,
                                                number: e.target.value,
                                            });
                                        }
                                    }}
                                />
                            </div>

                            {/* AGE */}
                            <div className="mb-3">
                                <label className="form-label">Age</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={patient.age}
                                    onChange={(e) =>
                                        setPatient({
                                            ...patient,
                                            age: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            {/* GENDER */}
                            <div className="mb-3">
                                <label className="form-label">Gender</label>
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
                                    <option value="">Select Gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={handleSavePatient}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
