import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import ServiceList from "./ServiceList";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";
import { toWords } from "number-to-words";

export default function PatientDetails() {
    const navigate = useNavigate();
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const { id } = useParams();
    const [details, setDetails] = useState(null);
    const [editingAppt, setEditingAppt] = useState(null);
    const [appointmentId, setAppointmentId] = useState(null);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [finalAmount, setFinalAmount] = useState(0);
    const [deleting, setDeleting] = useState(false);
    const [collected, setCollected] = useState(0);
    const [isFullPaid, setIsFullPaid] = useState(false);

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
    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/doctor/get_doc`);
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error("Error fetching doctor:", err);
        }
    }, [API_BASE_URL]);

    // ------------------------------------------------------------
    // FETCH SERVICES
    // ------------------------------------------------------------
    const fetchServices = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/services/fetchall_services`,
            );
            const data = await res.json();
            setAvailableServices(
                Array.isArray(data) ? data : data.services || [],
            );
        } catch (err) {
            console.error("Error fetching services:", err);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        if (!availableServices.length) return;

        setApptData((prev) => {
            if (!prev.service.length) return prev;

            const normalized = prev.service.map((s) => {
                const match = availableServices.find(
                    (as) => as._id === s._id || as._id === s.id,
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

    const handleDeletePatient = async () => {
        const confirmDelete = window.confirm(
            `Are you sure you want to delete patient "${details?.name}"?\nThis will remove all related appointments.`,
        );

        if (!confirmDelete) return;

        try {
            setDeleting(true);
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/delete_patient/${id}`,
                {
                    method: "DELETE",
                },
            );

            const data = await res.json();

            if (data.success) {
                alert("Patient deleted successfully");
                navigate("/");
            } else {
                alert(data.message || "Failed to delete patient");
            }
        } catch (err) {
            console.error(err);
            alert("Server error while deleting patient");
        } finally {
            setDeleting(false);
        }
    };

    // ------------------------------------------------------------
    // FETCH PATIENT + APPOINTMENTS
    // ------------------------------------------------------------
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, appointmentsRes] = await Promise.all([
                authFetch(
                    `${API_BASE_URL}/api/doctor/patient/patient_details/${id}`,
                ),
                authFetch(
                    `${API_BASE_URL}/api/doctor/patient/patient_record/${id}`,
                ),
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
                collectedAmount: patientData.collected,
            });

            setAppointmentId(appointmentsData.appointmentId);
            setAppointments(appointmentsData.visits || []);
            await fetchServices();
        } catch (err) {
            console.error("Error fetching patient:", err);
        } finally {
            setLoading(false);
        }
    }, [id, API_BASE_URL, fetchServices]);

    useEffect(() => {
        fetchData();
        fetchDoctor();
    }, [fetchData, fetchDoctor]);

    useEffect(() => {
        const total = apptData.service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );

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
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/update_patient/${id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(patient),
                },
            );

            const result = await response.json();
            if (response.ok) {
                alert("Patient updated successfully");
                setDetails((prev) => ({ ...prev, ...patient }));
            } else {
                alert(result.message || "Update failed");
            }
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    };

    const sortedAppointments = useMemo(() => {
        return [...appointments].sort(
            (a, b) => new Date(b.date) - new Date(a.date),
        );
    }, [appointments]);

    const serviceTotal = useMemo(() => {
        return apptData.service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
    }, [apptData.service, serviceAmounts]);

    const appointmentsForView = useMemo(() => {
        return sortedAppointments.map((visit) => ({
            ...visit,
            formattedDate: new Date(visit.date).toLocaleDateString("en-IN"),
        }));
    }, [sortedAppointments]);

    // ------------------------------------------------------------
    // INVOICE GENERATOR
    // ------------------------------------------------------------

    const handleInvoiceClick = (appointmentId, visit, details) => {
        let includeDiscount = true;

        // Ask only if discount exists
        if (visit.discount && visit.discount > 0) {
            includeDiscount = window.confirm(
                `This invoice has a discount applied.\n\nDo you want to include the discount in the invoice?`,
            );
        }

        generateInvoicePDF(visit, details, includeDiscount);
    };

    const generateInvoicePDF = (visit, details, includeDiscount) => {
        try {
            if (!doctor) {
                alert("Doctor details not loaded yet!");
                return;
            }

            const margin = 20;
            const invoiceNumber = visit.invoiceNumber || "N/A";
            const docPdf = new jsPDF();
            const pageWidth = docPdf.internal.pageSize.getWidth();

            let leftY = 20;
            let rightY = 20;

            // ================= HEADER =================
            docPdf.setFontSize(16);
            docPdf.text(doctor.clinicName || "", margin, leftY);
            leftY += 10;

            docPdf.setFontSize(14);
            docPdf.text(doctor.name || "", margin, leftY);
            leftY += 8;

            docPdf.setFontSize(11);

            if (doctor.degree?.length) {
                docPdf.text(doctor.degree.join(","), margin, leftY);
                leftY += 6;
            }

            if (doctor.regNumber) {
                docPdf.text(`Reg No: ${doctor.regNumber}`, margin, leftY);
                leftY += 6;
            }

            docPdf.text(`Invoice No: INV-${invoiceNumber}`, margin, leftY);
            leftY += 8;

            docPdf.text(
                `Patient: ${details.name} | Age: ${details.age || "N/A"} | Gender: ${
                    details.gender || "N/A"
                }`,
                margin,
                leftY,
            );
            leftY += 6;

            // ================= RIGHT SIDE INFO =================
            docPdf.setFontSize(11);

            if (doctor.address?.line1) {
                docPdf.text(doctor.address.line1, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }

            if (doctor.address?.line2) {
                docPdf.text(doctor.address.line2, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }

            if (doctor.address?.city) {
                docPdf.text(
                    `${doctor.address.city}, ${doctor.address.state} - ${doctor.address.pincode}`,
                    pageWidth - margin,
                    rightY,
                    { align: "right" },
                );
                rightY += 5;
            }

            if (doctor.phone) {
                docPdf.text(
                    `Phone: ${doctor.phone}`,
                    pageWidth - margin,
                    rightY,
                    {
                        align: "right",
                    },
                );
                rightY += 5;
            }

            docPdf.text(
                `Date: ${visit.formattedDate}`,
                pageWidth - margin,
                rightY,
                {
                    align: "right",
                },
            );

            // ================= BILL CALCULATION =================
            const services = visit.service || [];

            const baseAmount = services.reduce(
                (sum, s) => sum + Number(s.amount || 0),
                0,
            );

            let discountValue = 0;
            let finalAmount = baseAmount;

            if (includeDiscount && visit.discount > 0) {
                discountValue = visit.isPercent
                    ? (baseAmount * visit.discount) / 100
                    : visit.discount;

                if (discountValue > baseAmount) discountValue = baseAmount;
                if (discountValue < 0) discountValue = 0;

                finalAmount = baseAmount - discountValue;
            }

            // ================= PAYMENT STATUS =================
            const collectedAmount = Number(visit.collected ?? finalAmount);

            const remainingAmount = finalAmount - collectedAmount;

            const paymentStatus =
                remainingAmount <= 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // ================= TABLE ROWS =================
            const tableRows = services.map((s) => [
                s.name,
                `Rs ${Number(s.amount).toFixed(0)}`,
            ]);
            tableRows.push(["TOTAL AMOUNT", `Rs ${finalAmount.toFixed(0)}`]);

            if (includeDiscount && visit.discount > 0) {
                tableRows.push([
                    `Discount ${
                        visit.isPercent
                            ? `(${visit.discount}%)`
                            : `(Rs ${visit.discount})`
                    }`,
                    `- Rs ${discountValue.toFixed(0)}`,
                ]);
            }

            // Payment breakdown
            tableRows.push(["Collected", `Rs ${collectedAmount.toFixed(0)}`]);
            if (remainingAmount !== 0) {
                tableRows.push([
                    "Payable Amount",
                    `Rs ${remainingAmount.toFixed(0)}`,
                ]);
            }
            tableRows.push(["Status", paymentStatus]);

            // ================= TABLE =================
            const tableStartY = leftY + 4;

            autoTable(docPdf, {
                startY: tableStartY,
                head: [["Service", "Amount"]],
                body: tableRows,
                theme: "grid",
                styles: { fontSize: 11, cellPadding: 3 },
                headStyles: {
                    fillColor: [60, 60, 60],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                },
                didParseCell: function (data) {
                    if (data.row.index >= tableRows.length - 4) {
                        data.cell.styles.fontStyle = "bold";
                    }
                },
            });

            // ================= AMOUNT IN WORDS =================
            const roundedAmount = Math.round(finalAmount);
            let y = docPdf.lastAutoTable.finalY + 8;

            const amountInWords = `Rupees ${toWords(
                roundedAmount,
            )} Only`.replace(/\b\w/g, (c) => c.toUpperCase());

            docPdf.setFontSize(11);
            docPdf.setFont(undefined, "bold");
            docPdf.text("Amount in Words:", margin, y);

            docPdf.setFont(undefined, "normal");
            docPdf.text(amountInWords, margin + 40, y);

            y += 8;

            // ================= FOOTER MESSAGE =================
            let receiptText = "";

            if (paymentStatus === "Paid") {
                receiptText = `Received with thanks from ${details.name} the sum of Rupees ${collectedAmount.toFixed(
                    0,
                )} only towards full settlement.`;
            } else if (paymentStatus === "Partial") {
                receiptText = `Part payment of Rupees ${collectedAmount.toFixed(
                    0,
                )} received from ${details.name}. Remaining amount of Rupees ${remainingAmount.toFixed(
                    0,
                )} is pending.`;
            } else {
                receiptText = `Total amount of Rupees ${finalAmount.toFixed(
                    0,
                )} is pending from ${details.name}.`;
            }

            docPdf.setFontSize(11);
            docPdf.text(receiptText, margin, y, {
                maxWidth: pageWidth - margin * 2,
            });

            y += 12;

            // ================= SIGNATURE =================
            docPdf.setFontSize(15);
            docPdf.text(doctor.name, pageWidth - margin, y, {
                align: "right",
            });

            y += 6;

            docPdf.setFontSize(12);
            docPdf.text("Signature", pageWidth - margin, y, {
                align: "right",
            });

            // ================= SAVE =================
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
                (as) => as._id === (s._id || s.id),
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
        setCollected(visit.collected || 0);

        document.getElementById("editAppointmentModalBtn").click();
    };

    const handleUpdateAppt = async () => {
        if (!editingAppt) {
            alert("No appointment selected");
            return;
        }
        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/edit_appointment/${editingAppt.appointmentId}/${editingAppt._id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        date: apptData.date,
                        service: apptData.service.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        payment_type: apptData.payment_type,
                        discount,
                        isPercent,
                        collected,
                    }),
                },
            );

            const data = await response.json();

            if (data.success) {
                alert("Invoice updated successfully!");
                setIsFullPaid(false);
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

        const response = await authFetch(
            `${API_BASE_URL}/api/doctor/appointment/delete_appointment/${appointmentId}/${visit._id}`,
            {
                method: "DELETE",
            },
        );

        const data = await response.json();

        if (data.success) {
            alert("Invoice deleted!");
            fetchData();
        } else {
            alert("Delete failed: " + data.message);
        }
    };

    useEffect(() => {
        if (!editingAppt) return;

        setCollected((prev) => {
            if (prev > finalAmount) {
                return finalAmount;
            }

            return prev;
        });
    }, [editingAppt,finalAmount]);

    useEffect(() => {
        if (isFullPaid) {
            setCollected(finalAmount);
        }
    }, [isFullPaid, finalAmount]);

    if (loading)
        return (
            <div className="d-flex flex-column justify-content-center align-items-center py-5">
                <div
                    className="spinner-border text-primary mb-3"
                    role="status"
                />
                <span className="text-theme-muted">
                    Loading patient details…
                </span>
            </div>
        );

    return (
        <>
            {/* Hidden button to trigger edit appointment modal */}
            <button
                id="editAppointmentModalBtn"
                className="d-none"
                data-bs-toggle="modal"
                data-bs-target="#editAppointmentModal"
            />

            <div className="container my-4">
                <div className="card shadow-sm border-0 rounded-4">
                    <div className="card-body">
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-3">
                                {/* Avatar */}
                                <div className="avatar-circle">
                                    {details?.name?.charAt(0)?.toUpperCase()}
                                </div>

                                <div>
                                    <h5 className="fw-semibold mb-0">
                                        {details?.name}
                                    </h5>
                                    <small className="text-theme-muted">
                                        {details?.number}
                                    </small>
                                </div>
                            </div>

                            <span
                                className={`badge rounded-pill px-3 py-2 gender-badge ${
                                    details?.gender?.toLowerCase() || "other"
                                }`}
                            >
                                {details?.gender || "N/A"}
                            </span>
                        </div>

                        {/* Info Grid */}
                        <div className="row g-3 mb-4">
                            <div className="col-6 col-md-4">
                                <div className="info-box">
                                    <span className="label">Age</span>
                                    <span className="value">
                                        {details?.age}
                                    </span>
                                </div>
                            </div>

                            <div className="col-6 col-md-4">
                                <div className="info-box">
                                    <span className="label">Gender</span>
                                    <span className="value">
                                        {details?.gender || "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="col-6 col-md-4">
                                <div className="info-box">
                                    <span className="label">Contact</span>
                                    <span className="value">
                                        {details?.number}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-primary rounded-pill px-4"
                                data-bs-toggle="modal"
                                data-bs-target="#editPatientModal"
                            >
                                ✏️ Edit Patient
                            </button>

                            <button
                                className="btn btn-outline-danger rounded-pill px-4"
                                disabled={deleting}
                                onClick={handleDeletePatient}
                            >
                                {deleting ? "Deleting..." : "🗑 Delete"}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-5">
                    <h5 className="fw-semibold mb-3">Previous Appointments</h5>

                    <div className="d-none d-md-block">
                        {appointments.length === 0 ? (
                            <div className="text-theme-muted">
                                No appointments found
                            </div>
                        ) : (
                            <table className="table align-middle table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th className="text-theme-muted">
                                            Date
                                        </th>
                                        <th className="text-theme-muted">
                                            Services
                                        </th>
                                        <th className="text-theme-muted">
                                            Amount
                                        </th>
                                        <th className="text-theme-muted">
                                            Status
                                        </th>
                                        <th className="text-theme-muted">
                                            Payment
                                        </th>
                                        <th className="text-end text-theme-muted">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {appointmentsForView.map((visit) => (
                                        <tr key={visit._id}>
                                            <td className="text-theme-muted">
                                                {visit.formattedDate}
                                            </td>

                                            <td className="text-theme-muted">
                                                {(visit.service || [])
                                                    .map((s) => s.name)
                                                    .join(", ")}
                                            </td>

                                            <td className="fw-semibold text-theme-muted">
                                                ₹
                                                {Number(
                                                    visit.collected ??
                                                        visit.amount ??
                                                        0,
                                                ).toFixed(0)}
                                            </td>
                                            <td>
                                                {(() => {
                                                    const collected = Number(
                                                        visit.collected ?? 0,
                                                    );
                                                    const total = Number(
                                                        visit.amount ?? 0,
                                                    );
                                                    const remaining =
                                                        total - collected;

                                                    const status =
                                                        remaining <= 0
                                                            ? "Paid"
                                                            : collected > 0
                                                              ? "Partial"
                                                              : "Unpaid";

                                                    const badgeClass =
                                                        status === "Paid"
                                                            ? "bg-success"
                                                            : status ===
                                                                "Partial"
                                                              ? "bg-warning text-dark"
                                                              : "bg-danger";

                                                    return (
                                                        <span
                                                            className={`badge ${badgeClass}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <span className="payment-tag payment-bank">
                                                    {visit.payment_type ||
                                                        "N/A"}
                                                </span>
                                            </td>

                                            <td className="text-end">
                                                <button
                                                    className="btn btn-sm btn-success me-2"
                                                    onClick={() =>
                                                        handleInvoiceClick(
                                                            id,
                                                            visit,
                                                            details,
                                                        )
                                                    }
                                                >
                                                    Invoice
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-outline-warning me-2"
                                                    onClick={() =>
                                                        editInvoice(
                                                            appointmentId,
                                                            visit,
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() =>
                                                        deleteInvoice(
                                                            appointmentId,
                                                            visit,
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
                </div>
            </div>
            <div className="d-block d-md-none mt-3">
                {appointmentsForView.map((visit) => (
                    <div
                        key={visit._id}
                        className="card mb-3 shadow-sm rounded-4"
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <strong>{visit.formattedDate}</strong>

                                <div className="text-end">
                                    {visit.amount === visit.collected ? (
                                        <div className="fw-semibold text-success">
                                            ₹{visit.amount?.toFixed(0)}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="fw-semibold text-primary">
                                                ₹{visit.amount?.toFixed(0)}
                                            </div>
                                            <small className="text-muted d-block">
                                                Collected: ₹
                                                {visit.collected || 0}
                                            </small>
                                            <small className="text-danger d-block">
                                                Remaining: ₹
                                                {(
                                                    Number(visit.amount ?? 0) -
                                                    Number(visit.collected ?? 0)
                                                ).toFixed(0)}
                                            </small>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <p className="text-theme-muted mb-1 me-2">
                                    {(visit.service || [])
                                        .map((s) => s.name)
                                        .join(", ")}
                                </p>

                                <span
                                    className={`badge px-3 py-2 ${
                                        visit.status === "Paid"
                                            ? "bg-success"
                                            : visit.status === "Partial"
                                              ? "bg-warning text-dark"
                                              : "bg-danger"
                                    }`}
                                >
                                    {visit.status}
                                </span>
                            </div>

                            <span className="badge bg-secondary-subtle text-secondary mb-3">
                                {visit.payment_type || "N/A"}
                            </span>

                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-success w-100"
                                    onClick={() =>
                                        handleInvoiceClick(id, visit, details)
                                    }
                                >
                                    Invoice
                                </button>

                                <button
                                    className="btn btn-outline-warning w-100"
                                    onClick={() =>
                                        editInvoice(appointmentId, visit)
                                    }
                                >
                                    Edit
                                </button>

                                <button
                                    className="btn btn-outline-danger w-100"
                                    onClick={() =>
                                        deleteInvoice(appointmentId, visit)
                                    }
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
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
                                                    (s) =>
                                                        s._id === service._id,
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
                                                (s) => s._id !== id,
                                            ),
                                        }));
                                    }}
                                />
                            </div>

                            {/* SERVICE AMOUNT BREAKDOWN */}
                            {apptData.service.length > 0 && (
                                <>
                                    {/* ================= BILL HEADER ================= */}
                                    <div className="mb-3">
                                        <h6 className="fw-bold text-primary">
                                            Billing Summary
                                        </h6>
                                        <hr />
                                    </div>

                                    {/* ================= SERVICES BREAKDOWN ================= */}
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-body">
                                            <h6 className="fw-semibold mb-3">
                                                Services
                                            </h6>

                                            {apptData.service.map((s) => (
                                                <div
                                                    key={s._id}
                                                    className="d-flex justify-content-between align-items-center mb-2"
                                                >
                                                    <span>{s.name}</span>

                                                    <input
                                                        type="number"
                                                        className="form-control text-end"
                                                        style={{
                                                            maxWidth: "140px",
                                                        }}
                                                        value={
                                                            serviceAmounts[
                                                                s._id
                                                            ] ?? s.amount
                                                        }
                                                        onChange={(e) =>
                                                            setServiceAmounts(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [s._id]:
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                }),
                                                            )
                                                        }
                                                    />
                                                </div>
                                            ))}

                                            <hr />

                                            <div className="d-flex justify-content-between fw-semibold">
                                                <span>Total</span>
                                                <span>
                                                    ₹ {serviceTotal.toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ================= DISCOUNT SECTION ================= */}
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-body">
                                            <h6 className="fw-semibold mb-3">
                                                Discount
                                            </h6>

                                            <div className="row align-items-center">
                                                <div className="col-md-6">
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        value={discount.toFixed(
                                                            0,
                                                        )}
                                                        min={0}
                                                        max={
                                                            isPercent
                                                                ? 100
                                                                : serviceTotal
                                                        }
                                                        onChange={(e) =>
                                                            setDiscount(
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                    />
                                                </div>

                                                <div className="col-md-6">
                                                    <div className="form-check form-switch">
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            checked={isPercent}
                                                            onChange={(e) =>
                                                                setIsPercent(
                                                                    e.target
                                                                        .checked,
                                                                )
                                                            }
                                                        />
                                                        <label className="form-check-label">
                                                            {isPercent
                                                                ? "Percentage (%)"
                                                                : "Flat Amount (₹)"}
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="d-flex justify-content-between mt-3 text-danger">
                                                <span>Discount Applied</span>
                                                <span>
                                                    ₹{" "}
                                                    {(
                                                        serviceTotal -
                                                        finalAmount
                                                    ).toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ================= PAYMENT SECTION ================= */}
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-body">
                                            <h6 className="fw-semibold mb-3">
                                                Payment Details
                                            </h6>

                                            <div className="card border-0 shadow-sm mb-4">
                                                <div className="card-body">
                                                    <div className="row align-items-start">
                                                        {/* LEFT SIDE */}
                                                        <div className="col-md-6">
                                                            <label className="form-label fw-semibold">
                                                                Amount Collected
                                                            </label>

                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={collected.toFixed(
                                                                    0,
                                                                )}
                                                                min={0}
                                                                max={
                                                                    finalAmount
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    let value =
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );
                                                                    if (
                                                                        value <
                                                                        0
                                                                    )
                                                                        value = 0;
                                                                    if (
                                                                        value >
                                                                        finalAmount
                                                                    )
                                                                        value =
                                                                            finalAmount;

                                                                    setCollected(
                                                                        value,
                                                                    );

                                                                    // Auto untick if manually edited
                                                                    if (
                                                                        value !==
                                                                        finalAmount
                                                                    ) {
                                                                        setIsFullPaid(
                                                                            false,
                                                                        );
                                                                    }
                                                                }}
                                                            />

                                                            {/* Checkbox */}
                                                            <div className="form-check mt-3">
                                                                <input
                                                                    className="form-check-input"
                                                                    type="checkbox"
                                                                    checked={
                                                                        isFullPaid
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setIsFullPaid(
                                                                            e
                                                                                .target
                                                                                .checked,
                                                                        )
                                                                    }
                                                                    id="fullPaidCheck"
                                                                />
                                                                <label
                                                                    className="form-check-label fw-medium"
                                                                    htmlFor="fullPaidCheck"
                                                                >
                                                                    Full Amount
                                                                    Collected
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {/* RIGHT SIDE */}
                                                        <div className="col-md-6 text-md-end mt-4 mt-md-0">
                                                            <small className="text-muted d-block">
                                                                Remaining
                                                            </small>

                                                            <h5 className="fw-bold text-warning mb-1">
                                                                ₹{" "}
                                                                {(
                                                                    finalAmount -
                                                                    collected
                                                                ).toFixed(0)}
                                                            </h5>

                                                            <span
                                                                className={`badge px-3 py-2 ${
                                                                    finalAmount -
                                                                        collected ===
                                                                    0
                                                                        ? "bg-success"
                                                                        : collected >
                                                                            0
                                                                          ? "bg-warning text-dark"
                                                                          : "bg-danger"
                                                                }`}
                                                            >
                                                                {finalAmount -
                                                                    collected ===
                                                                0
                                                                    ? "Paid"
                                                                    : collected >
                                                                        0
                                                                      ? "Partial"
                                                                      : "Unpaid"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ================= FINAL SUMMARY ================= */}
                                    <div className="card border-primary shadow-sm">
                                        <div className="card-body d-flex justify-content-between align-items-center">
                                            <h6 className="mb-0 fw-bold">
                                                Final Amount
                                            </h6>
                                            <h5 className="mb-0 fw-bold text-primary">
                                                ₹ {finalAmount.toFixed(0)}
                                            </h5>
                                        </div>
                                    </div>
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
                                    <option value="SBI">SBI</option>
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
            {/* ================= EDIT PATIENT MODAL ================= */}
            <div
                className="modal fade"
                id="editPatientModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                Edit Patient Details
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            />
                        </div>

                        <div className="modal-body">
                            {/* NAME */}
                            <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    value={patient.name}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* MOBILE */}
                            <div className="mb-3">
                                <label className="form-label">
                                    Mobile Number
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="number"
                                    value={patient.number}
                                    onChange={handleChange}
                                    maxLength={10}
                                    minLength={10}
                                />
                            </div>

                            {/* AGE */}
                            <div className="mb-3">
                                <label className="form-label">Age</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="age"
                                    value={patient.age}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* GENDER */}
                            <div className="mb-3">
                                <label className="form-label">Gender</label>
                                <select
                                    className="form-select"
                                    name="gender"
                                    value={patient.gender}
                                    onChange={handleChange}
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                                onClick={() => setPatient(details)}
                            >
                                Cancel
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
        </>
    );
}
