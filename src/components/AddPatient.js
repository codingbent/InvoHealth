import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ServiceList from "./ServiceList";
import { jwtDecode } from "jwt-decode";
import { authFetch } from "./authfetch";

const AddPatient = ({ showAlert }) => {
    const [patient, setPatient] = useState({
        name: "",
        service: [],
        number: "",
        amount: 0,
        age: "",
        gender: "Male",
    });
    
    const navigate=useNavigate();

    const [availableServices, setAvailableServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    // Discount
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);

    const [appointmentDate, setAppointmentDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [payment_type, setPaymentType] = useState("Cash");
    const { name, service, number, age, gender } = patient;
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const doctorId = decoded.user?.doctorId;
    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );

    // =========================
    // FETCH SERVICES
    // =========================
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`,
                );
                const data = await res.json();
                setAvailableServices(
                    Array.isArray(data) ? data : data.services || [],
                );
            } catch (err) {
                console.error("Error fetching services:", err);
            }
        };
        fetchServices();
    }, [API_BASE_URL]);

    // =========================
    // CALCULATE TOTAL
    // =========================
    const serviceTotal = useMemo(() => {
        return service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
    }, [service, serviceAmounts]);

    const finalAmount = serviceTotal;

    // =========================
    // AUTO SET COLLECTED = FINAL WHEN SERVICES CHANGE
    // =========================
    useEffect(() => {
        setPatient((prev) => ({
            ...prev,
            amount: finalAmount,
        }));
    }, [finalAmount]);


    // =========================
    // INPUT HANDLER
    // =========================
    const onChange = (e) => {
        setPatient({ ...patient, [e.target.name]: e.target.value });
    };
    const calculatedDiscount = useMemo(() => {
        if (!discount || discount <= 0) return 0;

        if (isPercent) {
            return (finalAmount * discount) / 100;
        }

        return discount;
    }, [discount, isPercent, finalAmount]);
    
    useEffect(() => {
    const autoCollected = Math.max(finalAmount - calculatedDiscount, 0);

    setPatient((prev) => ({
        ...prev,
        amount: autoCollected,
    }));
}, [calculatedDiscount, finalAmount]);
    // =========================
    // SUBMIT
    // =========================
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 🚨 SERVICE REQUIRED
        if (!service || service.length === 0) {
            showAlert("Please select at least one service", "warning");
            return;
        }
        if (number.length !== 10) {
            alert("Mobile number must be exactly 10 digits");
            return;
        }

        let finalNumber = number.trim();
        if (!isPercent && discount > serviceTotal) {
            alert("Discount cannot exceed total amount");
            return;
        }
        if ((patient.amount > finalAmount)||patient.amount > finalAmount-calculatedDiscount) {
            alert("Collected amount cannot exceed final amount");
            return;
        }
        if (isPercent && discount > 100) {
            alert("Percentage cannot exceed 100%");
            return;
        }
        // extract doctorId once
        if (isPercent) {
            setDiscount((finalAmount * discount) / 100);
        }
        const collectedAmount = Number(patient.amount) || 0;
        const totalAmount = finalAmount;

        let computedStatus = "Unpaid";
        let computedRemaining = totalAmount;

        if (collectedAmount >= totalAmount) {
            computedStatus = "Paid";
            computedRemaining = 0;
        } else if (collectedAmount > 0) {
            computedStatus = "Partial";
            computedRemaining = totalAmount - collectedAmount;
        }
        try {
            // 1️⃣ CREATE PATIENT
            const patientRes = await authFetch(
                `${API_BASE_URL}/api/auth/addpatient`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        gender,
                        number: finalNumber,
                        age,
                    }),
                },
            );

            const patientJson = await patientRes.json();

            if (!patientJson.success) {
                showAlert(
                    patientJson.error || "Failed to add patient",
                    "danger",
                );
                return;
            }

            const newPatientId = patientJson.patient._id;

            // 2️⃣ CREATE APPOINTMENT (billing happens here)
            const appointmentRes = await authFetch(
                `${API_BASE_URL}/api/auth/addappointment/${newPatientId}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        service: service.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        collected: patient.amount,
                        status: computedStatus,
                        remaining: computedRemaining,
                        date: appointmentDate,
                        payment_type,
                        doctorId,
                        discount,
                        isPercent,
                    }),
                },
            );

            const appointmentJson = await appointmentRes.json();

            if (appointmentJson.success) {
                showAlert("Patient and appointment added!", "success");
                navigate("/");
            } else {
                showAlert("Patient added but appointment failed", "warning");
            }
        } catch (err) {
            console.error(err);
            showAlert("Server error", "danger");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="modal-content border-0 shadow-lg rounded-4">
                {/* HEADER */}
                <div className="modal-header border-0 pb-2">
                    <div>
                        <h5 className="modal-title fw-semibold mb-0">
                            🧑‍⚕️ Add Patient
                        </h5>
                        <small className="text-theme-muted">
                            Create patient & initial appointment
                        </small>
                    </div>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                    />
                </div>

                {/* BODY */}
                <div className="modal-body pt-3">
                    {/* BASIC INFO */}
                    <h6 className="text-uppercase text-theme-muted small mb-3">
                        Patient Details
                    </h6>
                    <div className="row g-3 mb-4">
                        <div className="col-md-6">
                            <label className="form-label small">
                                Full Name
                            </label>
                            <input
                                type="text"
                                className="form-control rounded-3"
                                name="name"
                                value={name}
                                onChange={onChange}
                                placeholder="Enter patient name"
                                required
                            />
                        </div>

                        <div className="col-md-3">
                            <label className="form-label small">Gender</label>
                            <select
                                className="form-select rounded-3"
                                name="gender"
                                value={gender}
                                onChange={onChange}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>

                        <div className="col-md-3">
                            <label className="form-label small">Age</label>
                            <input
                                type="number"
                                className="form-control rounded-3"
                                name="age"
                                value={age}
                                onChange={onChange}
                                placeholder="Age"
                            />
                        </div>
                    </div>
                    {/* CONTACT */}
                    <div className="mb-4">
                        <label className="form-label small">
                            Mobile Number
                        </label>
                        <input
                            type="tel"
                            className="form-control rounded-3"
                            name="number"
                            value={number}
                            placeholder="10-digit mobile number"
                            onChange={(e) => {
                                const onlyDigits = e.target.value.replace(
                                    /\D/g,
                                    "",
                                );
                                if (onlyDigits.length <= 10) {
                                    setPatient({
                                        ...patient,
                                        number: onlyDigits,
                                    });
                                }
                            }}
                        />
                    </div>
                    {/* SERVICES */}
                    <h6 className="text-uppercase text-theme-muted small mb-2">
                        Services & Billing
                    </h6>
                    <div className="mb-3">
                        <ServiceList
                            services={availableServices}
                            selectedServices={service}
                            onAdd={(serviceObj) => {
                                setPatient((prev) =>
                                    prev.service.some(
                                        (s) => s._id === serviceObj._id,
                                    )
                                        ? prev
                                        : {
                                              ...prev,
                                              service: [
                                                  ...prev.service,
                                                  serviceObj,
                                              ],
                                          },
                                );

                                setServiceAmounts((prev) => ({
                                    ...prev,
                                    [serviceObj._id]: serviceObj.amount ?? 0,
                                }));
                            }}
                            onRemove={(id) => {
                                setPatient((prev) => ({
                                    ...prev,
                                    service: prev.service.filter(
                                        (s) => s._id !== id,
                                    ),
                                }));

                                setServiceAmounts((prev) => {
                                    const copy = { ...prev };
                                    delete copy[id];
                                    return copy;
                                });
                            }}
                        />
                    </div>
                    {/* BILLING */}
                    {service.length > 0 && (
                        <div className="border rounded-4 p-3 mb-4">
                            {/* SERVICES TABLE */}
                            <table className="table table-sm align-middle mb-3">
                                <thead className="table-light">
                                    <tr>
                                        <th>Service</th>
                                        <th className="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {service.map((s) => (
                                        <tr key={s._id}>
                                            <td>{s.name}</td>
                                            <td className="text-end">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm text-end rounded-3"
                                                    style={{
                                                        maxWidth: 120,
                                                        float: "right",
                                                    }}
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
                                                                        .value,
                                                                ),
                                                            }),
                                                        )
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* TOTAL */}
                            <div className="d-flex justify-content-between fw-semibold mt-3">
                                <span>Final Amount</span>
                                <span className="text-primary">
                                    ₹ {finalAmount}
                                </span>
                            </div>
                        </div>
                    )}
                    {/* DISCOUNT SECTION */}
                    <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label fw-semibold mb-0">
                                Discount
                            </label>
                            <div className="form-check form-switch">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={isPercent}
                                    onChange={(e) =>
                                        setIsPercent(e.target.checked)
                                    }
                                />
                                <label className="form-check-label small">
                                    {isPercent
                                        ? "Percentage (%)"
                                        : "Flat Amount (₹)"}
                                </label>
                            </div>
                        </div>
                        <input
                            type="number"
                            className="form-control rounded-3"
                            placeholder={isPercent ? "Enter %" : "Enter amount"}
                            value={discount}
                            min={0}
                            max={isPercent ? 100 : finalAmount}
                            onChange={(e) => {
                                let value = Number(e.target.value);
                                if (value < 0) value = 0;
                                if (isPercent && value > 100) value = 100;
                                if (!isPercent && value > finalAmount)
                                    value = finalAmount;
                                setDiscount(value);
                                
                            }}
                        />
                    </div>
                    {/* AMOUNT COLLECTED */}
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold">Amount Collected</span>

                        <input
                            type="number"
                            className="form-control text-end rounded-3"
                            style={{ maxWidth: "140px" }}
                            value={patient.amount.toFixed(0)}
                            onChange={(e) =>
                                setPatient((prev) => ({
                                    ...prev,
                                    amount: Number(e.target.value),
                                }))
                            }
                        />
                    </div>
                    {/* DISCOUNT GIVEN */}
                    <div className="d-flex justify-content-between">
                        <span className="text-muted">Discount Given</span>
                        <span className="text-danger">
                            ₹ {calculatedDiscount.toFixed(0)}
                        </span>
                    </div>
                    {/* PAYABLE AMOUNT */}
                    <div className="d-flex justify-content-between fw-semibold mt-2">
                        <span>Payable Amount</span>
                        <span className="text-success">
                            ₹
                            {Math.max(finalAmount - patient.amount-calculatedDiscount, 0).toFixed(0)}
                        </span>
                    </div>
                    {/* APPOINTMENT */}
                    <h6 className="text-uppercase text-theme-muted small mb-2">
                        Appointment & Payment
                    </h6>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <label className="form-label small">
                                Appointment Date
                            </label>
                            <input
                                type="date"
                                className="form-control rounded-3"
                                value={appointmentDate}
                                onChange={(e) =>
                                    setAppointmentDate(e.target.value)
                                }
                            />
                        </div>

                        <div className="col-md-6">
                            <label className="form-label small">
                                Payment Type
                            </label>
                            <select
                                className="form-select rounded-3"
                                value={payment_type}
                                onChange={(e) => setPaymentType(e.target.value)}
                            >
                                <option>Cash</option>
                                <option>Card</option>
                                <option>UPI</option>
                                <option>ICICI</option>
                                <option>HDFC</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="modal-footer border-0">
                    <button
                        type="button"
                        className="btn btn-outline-secondary rounded-3"
                        data-bs-dismiss="modal"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        className="btn btn-primary rounded-3 px-4"
                        disabled={service.length === 0}
                    >
                        Save & Create
                    </button>
                </div>
            </div>
        </form>
    );
};

export default AddPatient;
