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
    const [appointmentId, setAppointmentId] = useState(null);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [serviceTotal, setServiceTotal] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [finalAmount, setFinalAmount] = useState(0);

    const [apptData, setApptData] = useState({
        date: "",
        service: [],
        payment_type: "",
    });

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
    useEffect(() => {
        if (!availableServices.length) return;

        setApptData((prev) => {
            if (!prev.service.length) return prev;

            const normalized = prev.service.map((s) => {
                const match = availableServices.find(
                    (as) => as._id === s._id || as._id === s.id
                );

                return {
                    ...s,
                    _id: match?._id || s._id,
                    amount: s.amount ?? match?.amount ?? 0,
                };
            });

            return { ...prev, service: normalized };
        });
    }, [availableServices]);

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

            setAppointmentId(appointmentsData.appointmentId);
            setAppointments(appointmentsData.visits || []);
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
    useEffect(() => {
        const total = apptData.service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0
        );

        setServiceTotal(total);

        let discountValue = 0;
        if (discount > 0) {
            discountValue = isPercent ? total * (discount / 100) : discount;
        }

        if (discountValue > total) discountValue = total;
        if (discountValue < 0) discountValue = 0;

        setFinalAmount(Math.round((total - discountValue) * 100) / 100);
    }, [apptData.service, serviceAmounts, discount, isPercent]);

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
                head: [["Service", "Amount (Rs.)"]],
                body: (visit.service || []).map((s) => [
                    typeof s === "object" ? s.name : s,
                    typeof s === "object" ? s.amount : Number(s),
                ]),
                theme: "grid",
                styles: { fontSize: 11, cellPadding: 3 },
                headStyles: { fillColor: [0, 0, 0] },
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

    const editInvoice = (appointmentId, visit) => {
        setEditingAppt({
            appointmentId,
            _id: visit._id,
        });
        const normalizedServices = (visit.service || []).map((s) => {
            const realService = availableServices.find(
                (as) => as._id === (s._id || s.id)
            );

            return {
                _id: realService?._id || s._id || s.id,
                name: s.name,
                amount: s.amount ?? realService?.amount ?? 0,
            };
        });

        setApptData({
            date: visit.date?.slice(0, 10),
            service: normalizedServices,
            payment_type: visit.payment_type || "",
        });

        // Service amount map
        const amountMap = {};
        normalizedServices.forEach((s) => {
            amountMap[s._id] = s.amount || 0;
        });

        setServiceAmounts(amountMap);
        setDiscount(visit.discount || 0);
        setIsPercent(!!visit.isPercent);

        document.getElementById("editAppointmentModalBtn").click();
    };

    const handleUpdateAppt = async () => {
        if (!editingAppt) {
            alert("No appointment selected");
            return;
        }
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
                        service: apptData.service.map((s) => ({
                            ...s,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        amount: finalAmount,
                        payment_type: apptData.payment_type,
                        discount,
                        isPercent,
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
            console.error("Edit invoice error:", err);
            alert("Server error");
        }
    };

    const deleteInvoice = async (appointmentId, visit) => {
        if (!window.confirm("Delete this invoice?")) return;

        const token = localStorage.getItem("token");

        const response = await fetch(
            `${API_BASE_URL}/api/auth/delete-invoice/${appointmentId}/${visit._id}`,
            {
                method: "DELETE",
                headers: { "auth-token": token },
            }
        );

        const data = await response.json();

        if (data.success) {
            alert("Invoice deleted!");
            fetchData();
        } else {
            alert("Delete failed: " + data.message);
        }
    };

    if (loading) return <p>Loading patient details...</p>;

    return (
        <>
            {/* Hidden button to trigger edit appointment modal */}
            <button
                id="editAppointmentModalBtn"
                style={{ display: "none" }}
                data-bs-toggle="modal"
                data-bs-target="#editAppointmentModal"
            />

            <div className="container">
                {/* ================= PATIENT INFO ================= */}
                <div className="m-2">
                    <h3>Name: {details?.name}</h3>
                    <h3>Number: {details?.number}</h3>
                    <h3>Age: {details?.age}</h3>
                    <h3>Gender: {details?.gender || "N/A"}</h3>
                </div>

                {/* ================= APPOINTMENTS ================= */}
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

                                            <td>₹{visit.amount}</td>

                                            <td>
                                                {visit.payment_type || "N/A"}
                                            </td>

                                            <td className="text-nowrap">
                                                <button
                                                    className="btn btn-sm btn-success me-1"
                                                    onClick={() =>
                                                        generateInvoice(
                                                            id,
                                                            visit,
                                                            details
                                                        )
                                                    }
                                                >
                                                    Invoice
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-warning me-1"
                                                    onClick={() =>
                                                        editInvoice(
                                                            appointmentId,
                                                            visit
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() =>
                                                        deleteInvoice(
                                                            appointmentId,
                                                            visit
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
                    )}
                </div>
                {/* ================= MOBILE VIEW ================= */}
                <div className="d-block d-md-none">
                    {appointments
                        .slice()
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map((visit) => (
                            <div
                                key={visit._id}
                                className="card mb-3 shadow-sm"
                            >
                                <div className="card-body">
                                    {/* DATE */}
                                    <h6 className="fw-bold mb-1">
                                        {new Date(
                                            visit.date
                                        ).toLocaleDateString("en-IN")}
                                    </h6>

                                    {/* SERVICES */}
                                    <p className="mb-1">
                                        <strong>Services:</strong>{" "}
                                        {(visit.service || [])
                                            .map((s) => s.name)
                                            .join(", ")}
                                    </p>

                                    {/* PAYMENT + TOTAL */}
                                    <div className="d-flex justify-content-between mb-2">
                                        <span>
                                            <strong>Payment:</strong>{" "}
                                            {visit.payment_type || "N/A"}
                                        </span>
                                        <span className="fw-bold">
                                            ₹{visit.amount}
                                        </span>
                                    </div>

                                    {/* ACTION BUTTONS */}
                                    <div className="d-flex justify-content-between gap-2">
                                        <button
                                            className="btn btn-sm btn-outline-success w-100"
                                            onClick={() =>
                                                generateInvoice(
                                                    id,
                                                    visit,
                                                    details
                                                )
                                            }
                                        >
                                            Invoice
                                        </button>

                                        <button
                                            className="btn btn-sm btn-outline-warning w-100"
                                            onClick={() =>
                                                editInvoice(
                                                    appointmentId,
                                                    visit
                                                )
                                            }
                                        >
                                            Edit
                                        </button>

                                        <button
                                            className="btn btn-sm btn-outline-danger w-100"
                                            onClick={() =>
                                                deleteInvoice(
                                                    appointmentId,
                                                    visit
                                                )
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* ================= EDIT APPOINTMENT MODAL ================= */}
            <div
                className="modal fade"
                id="editAppointmentModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit Appointment</h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body">
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
                                <label className="form-label">Services</label>
                                <ServiceList
                                    services={availableServices}
                                    selectedServices={apptData.service}
                                    onAdd={(service) => {
                                        setApptData((prev) => {
                                            if (
                                                prev.service.some(
                                                    (s) => s._id === service._id
                                                )
                                            ) {
                                                return prev;
                                            }
                                            return {
                                                ...prev,
                                                service: [
                                                    ...prev.service,
                                                    service,
                                                ],
                                            };
                                        });
                                    }}
                                    onRemove={(id) => {
                                        setApptData((prev) => ({
                                            ...prev,
                                            service: prev.service.filter(
                                                (s) => s._id !== id
                                            ),
                                        }));
                                    }}
                                />
                            </div>

                            {/* SERVICE AMOUNT BREAKDOWN */}
                            {apptData.service.length > 0 && (
                                <>
                                    <label className="form-label fw-bold">
                                        Bill Details
                                    </label>

                                    <ul className="list-group mb-3">
                                        {apptData.service.map((s) => (
                                            <li
                                                key={s._id}
                                                className="list-group-item d-flex justify-content-between"
                                            >
                                                <span>{s.name}</span>
                                                <input
                                                    type="number"
                                                    value={
                                                        serviceAmounts[s._id] ??
                                                        s.amount
                                                    }
                                                    onChange={(e) =>
                                                        setServiceAmounts(
                                                            (prev) => ({
                                                                ...prev,
                                                                [s._id]: Number(
                                                                    e.target
                                                                        .value
                                                                ),
                                                            })
                                                        )
                                                    }
                                                />
                                            </li>
                                        ))}
                                    </ul>

                                    {/* DISCOUNT */}
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            Discount
                                        </label>

                                        <div className="d-flex gap-2">
                                            <input
                                                type="number"
                                                className="form-control"
                                                style={{ maxWidth: "200px" }}
                                                value={discount}
                                                onChange={(e) =>
                                                    setDiscount(
                                                        Number(e.target.value)
                                                    )
                                                }
                                            />

                                            <div className="form-check d-flex align-items-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={isPercent}
                                                    onChange={(e) =>
                                                        setIsPercent(
                                                            e.target.checked
                                                        )
                                                    }
                                                />
                                                <label className="form-check-label ms-1">
                                                    %
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SUMMARY */}
                                    <table className="table table-bordered">
                                        <tbody>
                                            <tr>
                                                <th>Total Before Discount</th>
                                                <td className="text-end">
                                                    ₹{serviceTotal}
                                                </td>
                                            </tr>

                                            <tr>
                                                <th>
                                                    Discount{" "}
                                                    {isPercent
                                                        ? `(${discount}%)`
                                                        : discount > 0
                                                        ? `(${discount})`
                                                        : ""}
                                                </th>
                                                <td className="text-end">
                                                    ₹
                                                    {(
                                                        serviceTotal -
                                                        finalAmount
                                                    ).toFixed(2)}
                                                </td>
                                            </tr>

                                            <tr className="table-primary fw-bold">
                                                <th>Final Amount</th>
                                                <td className="text-end">
                                                    ₹{finalAmount}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </>
                            )}

                            {/* PAYMENT */}
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
                                    <option value="ICICI">ICICI</option>
                                    <option value="HDFC">HDFC</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
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
