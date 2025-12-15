import { useState, useEffect } from "react";
import ServiceList from "./ServiceList";
import { jwtDecode } from "jwt-decode";

const AddPatient = ({ showAlert }) => {
    const [patient, setPatient] = useState({
        name: "",
        service: [],
        number: "0000000000",
        amount: 0,
        age: "",
        gender: "Male",
    });

    const [availableServices, setAvailableServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});

    // 🆕 Discount States
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

    // Fetch Services
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`,
                    { headers: { "auth-token": localStorage.getItem("token") } }
                );
                const data = await res.json();
                setAvailableServices(data);
            } catch (err) {
                console.error("Error fetching services:", err);
            }
        };
        fetchServices();
    }, []);

    useEffect(() => {
        const prices = service.map(
            (s) => serviceAmounts[s._id] ?? s.amount ?? 0
        );

        const serviceTotal = prices.reduce((sum, x) => sum + x, 0);

        let final = serviceTotal;

        if (discount > 0) {
            if (isPercent) {
                final -= serviceTotal * (discount / 100);
            } else {
                final -= discount;
            }
        }

        if (final < 0) final = 0;

        setPatient((prev) => ({ ...prev, amount: final }));
    }, [service, serviceAmounts, discount, isPercent]);

    const handleServiceAmountChange = (index, value) => {
        const newAmounts = [...serviceAmounts];
        newAmounts[index] = Number(value);
        setServiceAmounts(newAmounts);
    };

    const onChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    // Submit Form
    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            // Create Patient
            const patientRes = await fetch(
                `${API_BASE_URL}/api/auth/addpatient`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                    body: JSON.stringify({
                        name,
                        gender,
                        service: service.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        number,
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

            // Create Appointment
            const token = localStorage.getItem("token");
            const decoded = jwtDecode(token);
            const doctorId = decoded.doc?.id;

            const appointmentRes = await fetch(
                `${API_BASE_URL}/api/auth/addappointment/${newPatientId}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": token,
                    },
                    body: JSON.stringify({
                        service: service.map((s, index) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[index] ?? s.amount ?? 0,
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
                document.querySelector("#patientModal .btn-close").click();
            } else {
                showAlert("Patient added but appointment failed", "warning");
            }

            // Reset Form
            setPatient({
                name: "",
                service: [],
                number: "0000000000",
                amount: 0,
                age: "",
                gender: "Male",
            });

            setServiceAmounts([]);
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
            <div className="modal-content">
                <div className="modal-header">
                    <h1 className="modal-title fs-5">
                        Add Patient & Initial Appointment
                    </h1>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="modal"
                    />
                </div>

                <div className="modal-body">
                    {/* Name */}
                    <div className="mb-3">
                        <label className="form-label">Name</label>
                        <input
                            type="text"
                            className="form-control"
                            name="name"
                            value={name}
                            onChange={onChange}
                            required
                        />
                    </div>

                    {/* Gender */}
                    <div className="mb-3">
                        <label className="form-label">Gender</label>
                        <select
                            className="form-control"
                            name="gender"
                            value={gender}
                            onChange={onChange}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    {/* Services */}
                    <div className="mb-3">
                        <label className="form-label">Services</label>
                        <ServiceList
                            services={availableServices}
                            selectedServices={service}
                            onAdd={(serviceObj) => {
                                setPatient((prev) => {
                                    if (
                                        prev.service.some(
                                            (s) => s._id === serviceObj._id
                                        )
                                    ) {
                                        return prev;
                                    }
                                    return {
                                        ...prev,
                                        service: [...prev.service, serviceObj],
                                    };
                                });

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

                    {/* Bill Section */}
                    {service.length > 0 && (
                        <>
                            {/* 🔥 Discount Inputs BEFORE Table */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    Discount
                                </label>

                                <div className="d-flex gap-2">
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Enter discount"
                                        style={{ maxWidth: "200px" }}
                                        value={discount}
                                        onChange={(e) =>
                                            setDiscount(Number(e.target.value))
                                        }
                                    />

                                    {/* % Checkbox */}
                                    <div className="form-check d-flex align-items-center">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={isPercent}
                                            onChange={(e) =>
                                                setIsPercent(e.target.checked)
                                            }
                                            style={{ marginRight: "5px" }}
                                        />
                                        <label className="form-check-label">
                                            %
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* 🔥 Table for Services */}
                            <label className="form-label fw-bold">
                                Bill Details
                            </label>
                            <table className="table table-bordered">
                                <thead className="table-light">
                                    <tr>
                                        <th>Service</th>
                                        <th className="text-end">Amount ( )</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {service.map((s, index) => (
                                        <tr key={s._id}>
                                            <td>{s.name}</td>
                                            <td className="text-end">
                                                <input
                                                    type="number"
                                                    className="form-control text-end"
                                                    style={{
                                                        maxWidth: "120px",
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

                            {/* 🔥 Summary Table */}
                            <table className="table table-bordered">
                                <tbody>
                                    <tr>
                                        <th>Total Before Discount</th>
                                        <td className="text-end">
                                            {service.reduce(
                                                (sum, s, i) =>
                                                    sum +
                                                    (Number(
                                                        serviceAmounts[i]
                                                    ) ||
                                                        Number(s.amount) ||
                                                        0),
                                                0
                                            )}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>
                                            Discount
                                            {isPercent && ` (${discount}%)`}
                                            {!isPercent &&
                                                discount > 0 &&
                                                ` ( ${discount})`}
                                        </th>
                                        <td className="text-end">
                                            {discount > 0 ? discount : 0}
                                        </td>
                                    </tr>

                                    <tr className="table-primary fw-bold">
                                        <th>Final Amount After Discount</th>
                                        <td className="text-end"> {amount}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Appointment Date */}
                    <div className="mb-3">
                        <label className="form-label">Appointment Date</label>
                        <input
                            type="date"
                            className="form-control"
                            value={appointmentDate}
                            onChange={(e) => setAppointmentDate(e.target.value)}
                        />
                    </div>

                    {/* Payment Type */}
                    <div className="mb-3">
                        <label className="form-label">Payment Type</label>
                        <select
                            className="form-control"
                            value={payment_type}
                            onChange={(e) => setPaymentType(e.target.value)}
                        >
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="ICICI">ICICI</option>
                            <option value="HDFC">HDFC</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Number */}
                    <div className="mb-3">
                        <label className="form-label">Mobile Number</label>
                        <input
                            type="number"
                            className="form-control"
                            name="number"
                            value={number}
                            onChange={onChange}
                        />
                    </div>

                    {/* Age */}
                    <div className="mb-3">
                        <label className="form-label">Age</label>
                        <input
                            type="number"
                            className="form-control"
                            name="age"
                            value={age}
                            onChange={onChange}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        data-bs-dismiss="modal"
                    >
                        Close
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Add Patient & Appointment
                    </button>
                </div>
            </div>
        </form>
    );
};

export default AddPatient;
