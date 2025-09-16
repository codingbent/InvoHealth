import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ServiceList from "./ServiceList";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // note the import

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
    const [doctor, setDoctor] = useState(null);

    const fetchDoctor = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
                headers: { "auth-token": token },
            });
            const data = await res.json();
            if (data.success) {
                setDoctor(data.doctor);
            }
        } catch (err) {
            console.error("Error fetching doctor:", err);
        }
    };
    // Appointment edit state
    const [editingAppt, setEditingAppt] = useState(null);
    const [apptData, setApptData] = useState({
        date: "",
        service: [],
        amount: 0,
        payment_type: "",
    });
    const [apptServiceAmounts, setApptServiceAmounts] = useState([]);

    // Convert backend UTC to IST for datetime-local input
    const toISTDateTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const istOffset = 5.5 * 60; // IST +5:30 in minutes
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
        fetchDoctor();
    }, [id]);

    const handleChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    const handleSave = async () => {
        const num = patient.number;
        if (!/^\d{10}$/.test(num)) {
            alert("Please enter a valid 10-digit number.");
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
            payment_type: visit.payment_type || "",
        });
    };

    const handleApptServiceChange = (serviceObj, checked) => {
        setApptData((prev) => {
            let updatedServices = [...prev.service];
            let updatedAmounts = [...apptServiceAmounts];

            if (checked) {
                const exists = updatedServices.find(
                    (s) =>
                        (s._id || s.id || s.name) ===
                        (serviceObj._id || serviceObj.id || serviceObj.name)
                );
                if (!exists) {
                    updatedServices.push(serviceObj);
                    updatedAmounts.push(serviceObj.amount || 0);
                }
            } else {
                const index = updatedServices.findIndex(
                    (s) =>
                        (s._id || s.id || s.name) ===
                        (serviceObj._id || serviceObj.id || serviceObj.name)
                );
                if (index > -1) {
                    updatedServices.splice(index, 1);
                    updatedAmounts.splice(index, 1);
                }
            }

            const total = updatedAmounts.reduce((a, b) => a + b, 0);
            setApptServiceAmounts(updatedAmounts);
            return { ...prev, service: updatedServices, amount: total };
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
                        payment_type: apptData.payment_type,
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

    // --------------------- Generate Invoice ---------------------
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

            // --- Clinic Info (Left) ---
            docPdf.setFontSize(16);
            docPdf.text(doctor.clinicName, 20, y);
            y += 8;

            docPdf.setFontSize(12);
            // Include extended address
            const addressLines = [
                doctor.address.line1,
                doctor.address.line2,
                doctor.address.line3,
                `${doctor.address.city}, ${doctor.address.state}`,
                `Pincode: ${doctor.address.pincode}`,
            ].filter(Boolean); // remove empty lines
            addressLines.forEach((line) => {
                docPdf.text(line, 20, y);
                y += 6;
            });

            if (doctor.gstNumber) {
                docPdf.text(`GST: ${doctor.gstNumber}`, 20, y);
                y += 6;
            }

            // --- Doctor Info (Right) ---
            let rightY = 20;
            docPdf.setFontSize(14);
            docPdf.text(doctor.name, pageWidth - 20, rightY, {
                align: "right",
            });
            rightY += 6;
            if (doctor.degree && doctor.degree.length > 0) {
                docPdf.setFontSize(12);
                docPdf.text(doctor.degree.join(", "), pageWidth - 20, rightY, {
                    align: "right",
                });
                rightY += 6;
            }
            docPdf.text(
                `Doctor Contact: ${doctor.phone}`,
                pageWidth - 20,
                rightY,
                {
                    align: "right",
                }
            );
            rightY += 6;
            if (doctor.secondaryPhone) {
                docPdf.text(
                    `Appointment Contact: ${doctor.secondaryPhone}`,
                    pageWidth - 20,
                    rightY,
                    {
                        align: "right",
                    }
                );
                rightY += 6;
            }
            if (doctor.experience) {
                docPdf.text(
                    `Experience: ${doctor.experience}+ Years`,
                    pageWidth - 20,
                    rightY,
                    {
                        align: "right",
                    }
                );
                rightY += 6;
            }
            if (doctor.timings?.length) {
                const timingText = doctor.timings
                    .map((t) => {
                        const dayText = t.days?.length
                            ? t.days.join(", ")
                            : "Any Day";
                        const slotsText = t.slots
                            .map((s) => `${s.start}-${s.end}`)
                            .join(", ");
                        return `${dayText}: ${slotsText}`;
                    })
                    .join(" | ");
                docPdf.text(`Timings: ${timingText}`, pageWidth - 20, rightY, {
                    align: "right",
                });
                rightY += 6;
            }

            // --- Patient & Invoice Info ---
            y += 6;
            docPdf.setFontSize(12);
            docPdf.text(`Invoice Number: INV-${invoiceNumber}`, 20, y);
            y += 8;
            docPdf.text(`Patient Name: ${details.name}`, 20, y);
            y += 6;
            docPdf.text(`Phone: ${details.number}`, 20, y);
            y += 6;
            docPdf.text(`Age: ${details.age ?? "N/A"}`, 20, y);
            y += 6;
            docPdf.text(
                `Appointment Date: ${new Date(visit.date).toLocaleDateString(
                    "en-IN",
                    {
                        dateStyle: "medium",
                    }
                )}`,
                20,
                y
            );
            y += 12;
            docPdf.text(`Payment Type: ${visit.payment_type || "N/A"}`, 20, y);
            y += 8;

            // --- Services Table ---
            const serviceData = (visit.service || [])
                .filter(Boolean)
                .map((s) => [
                    typeof s === "object" ? s.name : s,
                    typeof s === "object"
                        ? Number(s.amount || 0)
                        : Number(s || 0),
                ]);

            autoTable(docPdf, {
                startY: y,
                head: [["Service", "Amount (₹)"]],
                body: serviceData,
                theme: "grid",
                headStyles: { fillColor: [230, 230, 230] },
                styles: { fontSize: 12, cellPadding: 4 },
            });

            const finalY = docPdf.lastAutoTable?.finalY
                ? docPdf.lastAutoTable.finalY + 8
                : y + 8;
            const total = serviceData.reduce(
                (sum, item) => sum + Number(item[1]),
                0
            );
            docPdf.text(`Total: ₹${total}`, pageWidth - 20, finalY, {
                align: "right",
            });

            // --- Save PDF ---
            docPdf.save(
                `Invoice_${details.name}_${new Date().toLocaleDateString()}.pdf`
            );
        } catch (err) {
            console.error("Error generating invoice:", err);
            alert("Error generating invoice");
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

            <button
                type="button"
                className="btn btn-primary m-2"
                data-bs-toggle="modal"
                data-bs-target="#editPatientModal"
            >
                Edit Details
            </button>

            {/* ---------------- Appointments Table ---------------- */}
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
                                <th>Payment Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.map((appt, index) =>
                                appt.visits
                                    ?.slice()
                                    .sort(
                                        (a, b) =>
                                            new Date(b.date) - new Date(a.date)
                                    )
                                    .map((visit, vIndex) => (
                                        <tr key={`${index}-${vIndex}`}>
                                            <td>
                                                {visit.date
                                                    ? new Date(
                                                          visit.date
                                                      ).toLocaleDateString(
                                                          "en-IN",
                                                          {
                                                              dateStyle:
                                                                  "medium",
                                                          }
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
                                                {(visit.service || []).reduce(
                                                    (total, s) =>
                                                        total +
                                                        (typeof s === "object"
                                                            ? s.amount
                                                            : Number(s)),
                                                    0
                                                )}
                                            </td>
                                            <td>
                                                {visit.payment_type || "N/A"}
                                            </td>
                                            <td>
                                                {/* <button
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
                                                </button> */}
                                                <button
                                                    className="btn btn-success"
                                                    onClick={() =>
                                                        generateInvoice(
                                                            appt._id,
                                                            visit,
                                                            details
                                                        )
                                                    }
                                                >
                                                    Generate Invoice
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ---------------- Edit Appointment Modal ---------------- */}
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
                            />
                        </div>
                        <div className="modal-body">
                            <form>
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
                                    <label className="form-label">
                                        Services
                                    </label>
                                    <ServiceList
                                        onSelect={handleApptServiceChange}
                                        selectedServices={apptData.service}
                                        services={availableServices}
                                    />
                                </div>

                                {apptData.service.length > 0 && (
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Bill Details
                                        </label>
                                        <ul className="list-group mb-2">
                                            {apptData.service.map(
                                                (s, index) => (
                                                    <li
                                                        key={
                                                            s.id ||
                                                            s._id ||
                                                            index
                                                        }
                                                        className="list-group-item d-flex justify-content-between align-items-center"
                                                    >
                                                        <span>{s.name}</span>
                                                        <input
                                                            type="number"
                                                            className="form-control w-25"
                                                            value={
                                                                apptServiceAmounts[
                                                                    index
                                                                ] ??
                                                                s.amount ??
                                                                0
                                                            }
                                                            onChange={(e) => {
                                                                const newAmounts =
                                                                    [
                                                                        ...apptServiceAmounts,
                                                                    ];
                                                                newAmounts[
                                                                    index
                                                                ] = Number(
                                                                    e.target
                                                                        .value
                                                                );
                                                                setApptServiceAmounts(
                                                                    newAmounts
                                                                );

                                                                const updatedServices =
                                                                    [
                                                                        ...apptData.service,
                                                                    ];
                                                                updatedServices[
                                                                    index
                                                                ].amount =
                                                                    Number(
                                                                        e.target
                                                                            .value
                                                                    );
                                                                const total =
                                                                    updatedServices.reduce(
                                                                        (
                                                                            a,
                                                                            b
                                                                        ) =>
                                                                            a +
                                                                            (b.amount ||
                                                                                0),
                                                                        0
                                                                    );
                                                                setApptData(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        service:
                                                                            updatedServices,
                                                                        amount: total,
                                                                    })
                                                                );
                                                            }}
                                                        />
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                        <label className="form-label">
                                            Total Amount
                                        </label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={apptData.amount}
                                            readOnly
                                        />
                                    </div>
                                )}

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
                                        <option value="">
                                            Select Payment Type
                                        </option>
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
                                type="button"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleUpdateAppt}
                                data-bs-dismiss="modal"
                            >
                                Save changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---------------- Edit Patient Modal ---------------- */}
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
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
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
                                        name="number"
                                        value={patient.number}
                                        minLength={10}
                                        maxLength={10}
                                        placeholder="Enter 10-digit number"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (/^\d*$/.test(val))
                                                handleChange(e);
                                        }}
                                        required
                                    />
                                </div>
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
        </div>
    );
}
