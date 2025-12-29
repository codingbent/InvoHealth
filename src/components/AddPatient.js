import { useState, useEffect } from "react";
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

    const [availableServices, setAvailableServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});

    // Discount
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);

    const [appointmentDate, setAppointmentDate] = useState(
        new Date().toISOString().slice(0, 10)
    );
    const [payment_type, setPaymentType] = useState("Cash");

    const { name, service, number, amount, age, gender } = patient;

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // =========================
    // FETCH SERVICES
    // =========================
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`
                );
                const data = await res.json();
                setAvailableServices(
                    Array.isArray(data) ? data : data.services || []
                );
            } catch (err) {
                console.error("Error fetching services:", err);
            }
        };
        fetchServices();
    }, []);

    // =========================
    // CALCULATE TOTAL
    // =========================
    useEffect(() => {
        const serviceTotal = service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0
        );

        let final = serviceTotal;

        if (discount > 0) {
            final -= isPercent ? serviceTotal * (discount / 100) : discount;
        }

        if (final < 0) final = 0;

        setPatient((prev) => ({ ...prev, amount: final }));
    }, [service, serviceAmounts, discount, isPercent]);

    // =========================
    // INPUT HANDLER
    // =========================
    const onChange = (e) => {
        setPatient({ ...patient, [e.target.name]: e.target.value });
    };

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

        try {
            // =========================
            // CREATE PATIENT
            // =========================
            const patientRes = await authFetch(
                `${API_BASE_URL}/api/auth/addpatient`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        gender,
                        service: service.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        number: finalNumber,
                        amount,
                        age,
                        discount,
                        isPercent,
                    }),
                }
            );

            const patientJson = await patientRes.json();

            if (!patientJson.success) {
                showAlert(
                    patientJson.error || "Failed to add patient",
                    "danger"
                );
                return;
            }

            const newPatientId = patientJson.patient._id;

            // =========================
            // CREATE APPOINTMENT
            // =========================
            const token = localStorage.getItem("token");
            const decoded = jwtDecode(token);
            const doctorId = decoded.user?.doctorId;

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
                        amount,
                        date: appointmentDate,
                        payment_type,
                        doctorId,
                        discount,
                        isPercent,
                    }),
                }
            );

            const appointmentJson = await appointmentRes.json();

            if (appointmentJson.success) {
                showAlert("Patient and appointment added!", "success");
                document.querySelector("#patientModal .btn-close")?.click();
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                showAlert("Patient added but appointment failed", "warning");
            }

            // =========================
            // RESET FORM
            // =========================
            setPatient({
                name: "",
                service: [],
                number: "",
                amount: 0,
                age: "",
                gender: "Male",
            });

            setServiceAmounts({});
            setDiscount(0);
            setIsPercent(false);
            setAppointmentDate(new Date().toISOString().slice(0, 10));
            setPaymentType("Cash");
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
                        <small className="text-muted">
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
                    <h6 className="text-uppercase text-muted small mb-3">
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
                                    ""
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
                    <h6 className="text-uppercase text-muted small mb-2">
                        Services & Billing
                    </h6>

                    <div className="mb-3">
                        <ServiceList
                            services={availableServices}
                            selectedServices={service}
                            onAdd={(serviceObj) => {
                                setPatient((prev) =>
                                    prev.service.some(
                                        (s) => s._id === serviceObj._id
                                    )
                                        ? prev
                                        : {
                                              ...prev,
                                              service: [
                                                  ...prev.service,
                                                  serviceObj,
                                              ],
                                          }
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
                                        (s) => s._id !== id
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
                            {/* DISCOUNT */}
                            <div className="d-flex align-items-end gap-3 mb-3">
                                <div>
                                    <label className="form-label small">
                                        Discount
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control rounded-3"
                                        style={{ maxWidth: 160 }}
                                        value={discount}
                                        onChange={(e) =>
                                            setDiscount(Number(e.target.value))
                                        }
                                    />
                                </div>

                                <div className="form-check mt-4">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={isPercent}
                                        onChange={(e) =>
                                            setIsPercent(e.target.checked)
                                        }
                                    />
                                    <label className="form-check-label small">
                                        Percentage (%)
                                    </label>
                                </div>
                            </div>

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
                                                                        .value
                                                                ),
                                                            })
                                                        )
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* TOTAL */}
                            <div className="d-flex justify-content-between fw-semibold">
                                <span>Final Amount</span>
                                <span className="text-primary">₹ {amount}</span>
                            </div>
                        </div>
                    )}

                    {/* APPOINTMENT */}
                    <h6 className="text-uppercase text-muted small mb-2">
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
                        ✅ Save & Create
                    </button>
                </div>
            </div>
        </form>
    );
};

export default AddPatient;
