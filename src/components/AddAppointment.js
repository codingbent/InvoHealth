import { useEffect, useState } from "react";
import ServiceList from "./ServiceList";
import { authFetch } from "./authfetch";

const API_BASE_URL =
    process.env.NODE_ENV === "production"
        ? "https://gmsc-backend.onrender.com"
        : "http://localhost:5001";

export default function AddAppointment({ showAlert }) {
    /* ===================== STATES ===================== */
    const [searchText, setSearchText] = useState("");
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [collected, setCollected] = useState(0);
    const [allServices, setAllServices] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const [paymentType, setPaymentType] = useState("Cash");

    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);

    const [total, setTotal] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);

    const discountValue = Math.min(
        isPercent ? (total * discount) / 100 : discount,
        total,
    );

    const remaining = Math.max(finalAmount - collected, 0);

    const status =
        remaining === 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";
    /* ===================== FETCH SERVICES ===================== */
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`,
                );
                const data = await res.json();
                setAllServices(data.services || data || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchServices();
    }, []);

    /* ===================== PATIENT SEARCH (DEBOUNCED) ===================== */
    useEffect(() => {
        const delay = setTimeout(async () => {
            if (!searchText.trim()) {
                setPatients([]);
                return;
            }

            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/auth/search-patients?q=${searchText}`,
                );
                const data = await res.json();
                setPatients(data);
            } catch (err) {
                console.error(err);
            }
        }, 300);

        return () => clearTimeout(delay);
    }, [searchText]);

    /* ===================== CALCULATE TOTAL ===================== */
    useEffect(() => {
        const t = services.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
        setTotal(t);

        let discountValue = 0;
        if (discount > 0) {
            discountValue = isPercent ? (t * discount) / 100 : discount;
        }

        if (discountValue > t) discountValue = t;
        setFinalAmount(t - discountValue);
    }, [services, serviceAmounts, discount, isPercent]);

    /* ===================== HANDLERS ===================== */
    const selectPatient = (p) => {
        setSelectedPatient(p);
        setSearchText("");
        setPatients([]);
    };

    const changeServiceAmount = (id, value) => {
        setServiceAmounts((prev) => ({ ...prev, [id]: Number(value) }));
    };

    const resetForm = () => {
        setSelectedPatient(null);
        setServices([]);
        setServiceAmounts({});
        setDiscount(0);
        setIsPercent(false);
        setPaymentType("Cash");
        setAppointmentDate(new Date().toISOString().slice(0, 10));
    };

    /* ===================== SUBMIT ===================== */
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (!selectedPatient) {
            showAlert("Please select a patient", "warning");
            return;
        }

        if (services.length === 0) {
            showAlert("Select at least one service", "warning");
            return;
        }

        setIsSubmitting(true); // 🔒 lock submit

        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/auth/addappointment/${selectedPatient._id}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        service: services.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount,
                        })),
                        amount: finalAmount,
                        collected,
                        remaining,
                        status,
                        payment_type: paymentType,
                        discount,
                        isPercent,
                        date: appointmentDate,
                    }),
                },
            );

            const data = await res.json();

            if (!res.ok) {
                showAlert(data.error || "Failed to add appointment", "danger");
                return;
            }

            showAlert("Appointment added successfully", "success");
            resetForm();

            // ⏳ allow submit again after short delay
            setTimeout(() => {
                setIsSubmitting(false);
            }, 1500);
        } catch (err) {
            showAlert("Server error", "danger");
            setIsSubmitting(false);
        }
    };

    /* ===================== UI ===================== */
    return (
        <div className="card shadow-sm border-0 rounded-4">
            <div className="card-body">
                <h5 className="fw-bold mb-3">➕ Add Appointment</h5>

                {/* PATIENT SEARCH */}
                <label className="form-label fw-semibold">Patient</label>
                <input
                    className="form-control mb-2"
                    placeholder="Search by name or phone"
                    value={searchText}
                    onChange={(e) => {
                        setSearchText(e.target.value);
                        setSelectedPatient(null);
                    }}
                />

                {patients.length > 0 && (
                    <ul className="list-group mb-3">
                        {patients.map((p) => (
                            <li
                                key={p._id}
                                className="list-group-item list-group-item-action"
                                style={{ cursor: "pointer" }}
                                onClick={() => selectPatient(p)}
                            >
                                {p.name} — {p.number}
                            </li>
                        ))}
                    </ul>
                )}

                {selectedPatient && (
                    <div className="alert alert-success py-2">
                        Selected: <strong>{selectedPatient.name}</strong>
                    </div>
                )}

                {selectedPatient && (
                    <form onSubmit={handleSubmit}>
                        {/* DATE */}
                        <div className="mb-3">
                            <label className="form-label">
                                Appointment Date
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={appointmentDate}
                                onChange={(e) =>
                                    setAppointmentDate(e.target.value)
                                }
                            />
                        </div>

                        {/* SERVICES */}
                        <label className="form-label fw-semibold">
                            Services
                        </label>
                        <ServiceList
                            services={allServices}
                            selectedServices={services}
                            onAdd={(s) =>
                                setServices((prev) =>
                                    prev.some((x) => x._id === s._id)
                                        ? prev
                                        : [...prev, s],
                                )
                            }
                            onRemove={(id) => {
                                setServices((prev) =>
                                    prev.filter((s) => s._id !== id),
                                );
                                setServiceAmounts((prev) => {
                                    const c = { ...prev };
                                    delete c[id];
                                    return c;
                                });
                            }}
                        />

                        {/* BILL */}
                        {services.length > 0 && (
                            <>
                                <ul className="list-group my-3">
                                    {services.map((s) => (
                                        <li
                                            key={s._id}
                                            className="list-group-item d-flex justify-content-between align-items-center"
                                        >
                                            {s.name}
                                            <input
                                                type="number"
                                                className="form-control w-25"
                                                value={
                                                    serviceAmounts[s._id] ??
                                                    s.amount
                                                }
                                                onChange={(e) =>
                                                    changeServiceAmount(
                                                        s._id,
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>

                                {/* DISCOUNT */}
                                <div className="mb-3 d-flex gap-2 align-items-center">
                                    <input
                                        type="number"
                                        className="form-control w-50"
                                        placeholder="Discount"
                                        value={discount}
                                        onChange={(e) =>
                                            setDiscount(Number(e.target.value))
                                        }
                                    />
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={isPercent}
                                            onChange={(e) =>
                                                setIsPercent(e.target.checked)
                                            }
                                        />
                                        <label className="form-check-label">
                                            %
                                        </label>
                                    </div>
                                </div>

                                {/* SUMMARY */}
                                <div className="alert alert-light border">
                                    <div>Total: ₹ {total}</div>
                                    <div>
                                        Discount: ₹ {discountValue.toFixed(2)}
                                    </div>
                                    <div className="fw-bold">
                                        Final: ₹ {finalAmount}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">
                                        Amount Collected
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={collected}
                                        min={0}
                                        max={finalAmount}
                                        onChange={(e) => {
                                            let value = Number(e.target.value);
                                            if (value < 0) value = 0;
                                            if (value > finalAmount)
                                                value = finalAmount;
                                            setCollected(value);
                                        }}
                                    />
                                </div>

                                <div className="alert alert-light border">
                                    <div>Remaining: ₹ {remaining}</div>
                                    <div className="fw-semibold">
                                        Status:{" "}
                                        <span
                                            className={
                                                status === "Paid"
                                                    ? "text-success"
                                                    : status === "Partial"
                                                      ? "text-warning"
                                                      : "text-danger"
                                            }
                                        >
                                            {status}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* PAYMENT */}
                        <div className="mb-3">
                            <label className="form-label">Payment Type</label>
                            <select
                                className="form-select"
                                value={paymentType}
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

                        <button
                            className="btn btn-primary w-100"
                            type="submit"
                            disabled={isSubmitting || services.length === 0}
                        >
                            {isSubmitting ? "Saving..." : "Save Appointment"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
