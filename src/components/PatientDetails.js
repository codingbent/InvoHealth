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
                gender: patientData.gender || "",
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // INVOICE GENERATOR  (updated to include discount lines)
    // ------------------------------------------------------------
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

            // ------------------------------------------------------
            // HEADER — CLINIC + DOCTOR DETAILS
            // ------------------------------------------------------
            docPdf.setFontSize(16);
            docPdf.text(doctor.clinicName, margin, leftY);
            leftY += 10;

            docPdf.setFontSize(14);
            docPdf.text(doctor.name, margin, leftY);
            leftY += 8;

            docPdf.setFontSize(11);
            if (doctor.degree?.length) {
                docPdf.text(
                    `Degree: ${doctor.degree.join(", ")}`,
                    margin,
                    leftY
                );
                leftY += 6;
            }
            if (doctor.regNumber) {
                docPdf.text(`Reg No: ${doctor.regNumber}`, margin, leftY);
                leftY += 6;
            }

            docPdf.text(`Invoice No: INV-${invoiceNumber}`, margin, leftY);
            leftY += 8;

            docPdf.text(
                `Patient: ${details.name} | Age: ${
                    details.age || "N/A"
                } | Gender: ${details.gender || "N/A"}`,
                margin,
                leftY
            );
            leftY += 10;

            // ------------------------------------------------------
            // RIGHT SIDE — Clinic Address + Date
            // ------------------------------------------------------
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
                    {
                        align: "right",
                    }
                );
                rightY += 5;
            }

            docPdf.text(
                `Date: ${new Date(visit.date).toLocaleDateString("en-IN")}`,
                pageWidth - margin,
                rightY,
                { align: "right" }
            );

            // ------------------------------------------------------
            // TABLE START POSITION
            // ------------------------------------------------------
            const tableStartY = Math.max(leftY, rightY) + 10;

            // ------------------------------------------------------
            // CALCULATIONS
            // ------------------------------------------------------
            const serviceTotal = (visit.service || []).reduce(
                (sum, s) =>
                    sum + (typeof s === "object" ? s.amount : Number(s)),
                0
            );

            const disc = Number(visit.discount) || 0;
            const percent = !!visit.isPercent;

            const discountValue =
                disc > 0 ? (percent ? serviceTotal * (disc / 100) : disc) : 0;

            const finalAmount =
                typeof visit.amount !== "undefined" && visit.amount !== null
                    ? visit.amount
                    : Math.max(serviceTotal - discountValue, 0);

            // ------------------------------------------------------
            // BUILD TABLE BODY
            // ------------------------------------------------------
            const tableBody = (visit.service || []).map((s) => [
                typeof s === "object" ? s.name : s,
                typeof s === "object" ? s.amount : Number(s),
            ]);

            tableBody.push(["TOTAL", serviceTotal.toFixed(2)]);

            if (discountValue > 0) {
                tableBody.push([
                    percent ? `DISCOUNT (${disc}%)` : `DISCOUNT (₹${disc})`,
                    `- ${discountValue.toFixed(2)}`,
                ]);
            }

            tableBody.push(["FINAL AMOUNT", finalAmount.toFixed(2)]);

            // ------------------------------------------------------
            // RENDER TABLE
            // ------------------------------------------------------
            autoTable(docPdf, {
                startY: tableStartY,
                head: [["Service", "Amount (Rs.)"]],
                body: tableBody,
                theme: "grid",
                styles: { fontSize: 11, cellPadding: 3 },
                headStyles: { fillColor: [0, 0, 0] },
            });

            const afterTableY = docPdf.lastAutoTable.finalY + 12;

            // ------------------------------------------------------
            // RECEIPT TEXT
            // ------------------------------------------------------
            docPdf.setFontSize(11);
            docPdf.text(
                `Received with thanks from ${
                    details.name
                } the sum of Rupees ${finalAmount.toFixed(
                    2
                )} on account of consultation/services.`,
                margin,
                afterTableY
            );

            // ------------------------------------------------------
            // SIGNATURE / STAMP AREA
            // ------------------------------------------------------
            docPdf.setFontSize(12);
            docPdf.text(doctor.name, pageWidth - margin, pageHeight - 25, {
                align: "right",
            });

            if (doctor.degree && doctor.degree.length > 0) {
                docPdf.text(
                    doctor.degree.join(", "),
                    pageWidth - margin,
                    pageHeight - 18,
                    { align: "right" }
                );
            }

            // ------------------------------------------------------
            // SAVE PDF
            // ------------------------------------------------------
            docPdf.save(`Invoice_${details.name}.pdf`);
        } catch (err) {
            console.error(err);
        }
    };

    const editInvoice = (appointmentId, visit, details) => {
        setEditingAppt({ ...visit, appointmentId });

        // NORMALIZE SERVICE OBJECTS
        const normalizedServices = (visit.service || []).map((s) =>
            typeof s === "object"
                ? s
                : availableServices.find((x) => x.name === s) || {
                      name: s,
                      amount: 0,
                  }
        );

        setApptData({
            date: visit.date?.slice(0, 10),
            service: normalizedServices,
            amount:
                visit.amount ??
                normalizedServices.reduce((sum, s) => sum + (s.amount || 0), 0),
            payment_type: visit.payment_type,
            discount: visit.discount || 0,
            isPercent: !!visit.isPercent,
        });

        setApptServiceAmounts(normalizedServices.map((s) => s.amount || 0));

        // open modal
        document.getElementById("editAppointmentModalBtn").click();
    };

    const handleUpdateAppt = async () => {
        try {
            const token = localStorage.getItem("token");

            // send service objects as-is (backend will compute amount)
            const body = {
                date: apptData.date,
                service: apptData.service,
                amount: apptData.amount, // optional, backend recomputes from services + discount
                payment_type: apptData.payment_type,
                discount: apptData.discount || 0,
                isPercent: !!apptData.isPercent,
            };

            const response = await fetch(
                `${API_BASE_URL}/api/auth/edit-invoice/${editingAppt.appointmentId}/${editingAppt._id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": token,
                    },
                    body: JSON.stringify(body),
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
            alert("Server error");
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

    // compute visits count or other derived data if needed

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
                    <h3>Gender: {details?.gender || "N/A"}</h3>
                </div>

                <button
                    className="btn btn-primary m-2"
                    data-bs-toggle="modal"
                    data-bs-target="#editPatientModal"
                >
                    Edit Details
                </button>

                <div className="mt-4">
                    <h3>Previous Appointment Details</h3>

                    {appointments.length === 0 ? (
                        <p>No appointments found</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-bordered mt-2 patient-visit-table">
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
                                                <tr key={visit._id}>
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
                                                        {/* Show stored visit.amount if present, else compute */}
                                                        {typeof visit.amount !==
                                                            "undefined" &&
                                                        visit.amount !== null
                                                            ? visit.amount
                                                            : (
                                                                  visit.service ||
                                                                  []
                                                              ).reduce(
                                                                  (sum, s) =>
                                                                      sum +
                                                                      (typeof s ===
                                                                      "object"
                                                                          ? s.amount
                                                                          : Number(
                                                                                s
                                                                            )),
                                                                  0
                                                              )}
                                                    </td>
                                                    <td>
                                                        {visit.payment_type ||
                                                            "N/A"}
                                                    </td>
                                                    <td>
                                                        <div
                                                            className="dropdown"
                                                            data-bs-display="static"
                                                        >
                                                            <button
                                                                className="btn btn-primary dropdown-toggle"
                                                                data-bs-toggle="dropdown"
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

                            {/* MOBILE CARD VIEW (unchanged) */}
                            <div className="d-sm-none">
                                {appointments.map((appt) =>
                                    appt.visits
                                        .slice()
                                        .sort(
                                            (a, b) =>
                                                new Date(b.date) -
                                                new Date(a.date)
                                        )
                                        .map((visit) => (
                                            <div
                                                className="visit-card"
                                                key={visit._id}
                                            >
                                                <div className="visit-card-row">
                                                    <span>Date</span>
                                                    <span>
                                                        {new Date(
                                                            visit.date
                                                        ).toLocaleDateString(
                                                            "en-IN"
                                                        )}
                                                    </span>
                                                </div>

                                                <div className="visit-card-row">
                                                    <span>Services</span>
                                                    <span>
                                                        {(visit.service || [])
                                                            .map((s) =>
                                                                typeof s ===
                                                                "object"
                                                                    ? s.name
                                                                    : s
                                                            )
                                                            .join(", ")}
                                                    </span>
                                                </div>

                                                <div className="visit-card-row">
                                                    <span>Amount</span>
                                                    <span>
                                                        {typeof visit.amount !==
                                                            "undefined" &&
                                                        visit.amount !== null
                                                            ? visit.amount
                                                            : (
                                                                  visit.service ||
                                                                  []
                                                              ).reduce(
                                                                  (sum, s) =>
                                                                      sum +
                                                                      (typeof s ===
                                                                      "object"
                                                                          ? s.amount
                                                                          : Number(
                                                                                s
                                                                            )),
                                                                  0
                                                              )}
                                                    </span>
                                                </div>

                                                <div className="visit-card-row">
                                                    <span>Payment</span>
                                                    <span>
                                                        {visit.payment_type ||
                                                            "N/A"}
                                                    </span>
                                                </div>

                                                <div className="visit-card-actions mt-2">
                                                    <button
                                                        className="btn btn-primary btn-sm"
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
                                                    <button
                                                        className="btn btn-secondary btn-sm"
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
                                                    <button
                                                        className="btn btn-danger btn-sm"
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
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* EDIT PATIENT DETAILS MODAL (unchanged) */}
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

            {/* -------------------- EDIT APPOINTMENT MODAL (updated) -------------------- */}
            <div
                className="modal fade"
                id="editAppointmentModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h1 className="modal-title fs-5">
                                Edit Appointment
                            </h1>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <form>
                                {/* DATE */}
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

                                {/* SERVICES */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        Services
                                    </label>
                                    <ServiceList
                                        onSelect={(serviceObj, checked) => {
                                            let updatedServices = [
                                                ...apptData.service,
                                            ];
                                            let updatedAmounts = [
                                                ...apptServiceAmounts,
                                            ];

                                            if (checked) {
                                                updatedServices.push(
                                                    serviceObj
                                                );
                                                updatedAmounts.push(
                                                    serviceObj.amount || 0
                                                );
                                            } else {
                                                const i =
                                                    updatedServices.findIndex(
                                                        (s) =>
                                                            s.name ===
                                                            serviceObj.name
                                                    );
                                                if (i > -1) {
                                                    updatedServices.splice(
                                                        i,
                                                        1
                                                    );
                                                    updatedAmounts.splice(i, 1);
                                                }
                                            }

                                            const total = updatedAmounts.reduce(
                                                (sum, a) => sum + a,
                                                0
                                            );

                                            setApptServiceAmounts(
                                                updatedAmounts
                                            );
                                            setApptData((prev) => ({
                                                ...prev,
                                                service: updatedServices,
                                                amount: total,
                                            }));
                                        }}
                                        selectedServices={apptData.service}
                                        services={availableServices}
                                    />
                                </div>

                                {/* AMOUNT DISPLAY */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        Total Service Amount
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={apptData.service.reduce(
                                            (sum, s, i) =>
                                                sum +
                                                (Number(
                                                    apptServiceAmounts[i]
                                                ) ||
                                                    Number(s.amount) ||
                                                    0),
                                            0
                                        )}
                                        readOnly
                                    />
                                </div>

                                {/* DISCOUNT */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        Discount
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={apptData.discount}
                                        onChange={(e) =>
                                            setApptData((prev) => ({
                                                ...prev,
                                                discount: Number(
                                                    e.target.value
                                                ),
                                            }))
                                        }
                                    />
                                    <div className="form-check mt-2">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={!!apptData.isPercent}
                                            onChange={(e) =>
                                                setApptData((prev) => ({
                                                    ...prev,
                                                    isPercent: e.target.checked,
                                                }))
                                            }
                                        />
                                        <label className="form-check-label">
                                            Apply discount as %
                                        </label>
                                    </div>
                                </div>

                                {/* FINAL AMOUNT AFTER DISCOUNT */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        Final Amount (After Discount)
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={(() => {
                                            const serviceTotal =
                                                apptData.service.reduce(
                                                    (sum, s, i) =>
                                                        sum +
                                                        (Number(
                                                            apptServiceAmounts[
                                                                i
                                                            ]
                                                        ) ||
                                                            Number(s.amount) ||
                                                            0),
                                                    0
                                                );
                                            const disc =
                                                Number(apptData.discount) || 0;
                                            const percent =
                                                !!apptData.isPercent;
                                            const discountValue =
                                                disc > 0
                                                    ? percent
                                                        ? serviceTotal *
                                                          (disc / 100)
                                                        : disc
                                                    : 0;
                                            const final = Math.max(
                                                serviceTotal - discountValue,
                                                0
                                            );
                                            return final;
                                        })()}
                                        readOnly
                                    />
                                </div>

                                {/* PAYMENT TYPE */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        Payment Type
                                    </label>
                                    <select
                                        className="form-select"
                                        value={apptData.payment_type}
                                        onChange={(e) =>
                                            setApptData((prev) => ({
                                                ...prev,
                                                payment_type: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">Select Payment</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Card">Card</option>
                                        <option value="UPI">UPI</option>
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
                                onClick={handleUpdateAppt}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
