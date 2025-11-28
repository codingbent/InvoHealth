import { useState, useEffect } from "react";
import ServiceList from "./ServiceList";

const AddAppointment = (props) => {
    const [patientsList, setPatientsList] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [searchText, setSearchText] = useState("");

    const [selectedPatient, setSelectedPatient] = useState(
        localStorage.getItem("patient")
            ? JSON.parse(localStorage.getItem("patient"))
            : null
    );

    const [payment_type, setpayment_type] = useState("Cash");
    const [allServices, setAllServices] = useState([]);

    const [serviceTotal, setServiceTotal] = useState(0);

    // 🆕 DISCOUNT FIELDS
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);

    // 🆕 Final payable amount
    const [finalAmount, setFinalAmount] = useState(0);

    // 🆕 Appointment Date
    const [appointmentDate, setAppointmentDate] = useState(
        new Date().toISOString().slice(0, 10)
    );

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // FETCH SERVICES
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "auth-token": localStorage.getItem("token") || "",
                        },
                    }
                );
                const data = await res.json();
                setAllServices(data);
            } catch (err) {
                console.error("Error fetching services:", err);
            }
        };
        fetchServices();
    }, []);

    // FETCH PATIENTS
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/auth/fetchallpatients`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "auth-token": localStorage.getItem("token") || "",
                        },
                    }
                );
                const data = await res.json();
                setPatientsList(data);
                setFilteredPatients(data);
            } catch (err) {
                console.error("Error fetching patients:", err);
            }
        };
        fetchPatients();
    }, []);

    // FILTER PATIENTS
    useEffect(() => {
        const filtered = patientsList.filter((p) =>
            p.name.toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredPatients(filtered);
    }, [searchText, patientsList]);

    // CALCULATE TOTALS
    useEffect(() => {
        const total = services.reduce(
            (acc, s) => acc + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0
        );
        setServiceTotal(total);

        let discountValue = 0;

        if (discount > 0) {
            if (isPercent) discountValue = total * (discount / 100);
            else discountValue = discount;
        }

        if (discountValue > total) discountValue = total;
        if (discountValue < 0) discountValue = 0;

        setFinalAmount(total - discountValue);
    }, [services, serviceAmounts, discount, isPercent]);

    const handleSelectPatient = (patient) => {
        setSelectedPatient(patient);
        localStorage.setItem("patient", JSON.stringify(patient));
        setSearchText("");
    };

    const handleServiceAmountChange = (id, value) => {
        setServiceAmounts((prev) => ({
            ...prev,
            [id]: Number(value),
        }));
    };

    // SUBMIT APPOINTMENT
    const handleAddAppointment = async (e) => {
        e.preventDefault();

        if (!selectedPatient) {
            alert("Please select a patient first");
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/auth/addappointment/${selectedPatient._id}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token") || "",
                    },
                    body: JSON.stringify({
                        service: services.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        amount: finalAmount,
                        payment_type,
                        discount,
                        isPercent,
                        date: appointmentDate,
                    }),
                }
            );

            const result = await res.json();

            if (res.ok && result.success) {
                props.showAlert("Appointment added successfully!", "success");

                // Reset fields
                setServices([]);
                setServiceAmounts({});
                setServiceTotal(0);
                setFinalAmount(0);
                setDiscount(0);
                setIsPercent(false);
                setSelectedPatient(null);
                localStorage.removeItem("patient");
                setpayment_type("Cash");
                setAppointmentDate(new Date().toISOString().slice(0, 10));
            } else {
                props.showAlert(
                    result.error || "Failed to add appointment",
                    "danger"
                );
            }
        } catch (err) {
            console.error(err);
            props.showAlert("Server error", "danger");
        }
    };

    return (
        <>
            {/* Patient search */}
            <div className="mb-3">
                <label htmlFor="patientSearch" className="form-label">
                    Patient Name
                </label>
                <input
                    type="text"
                    className="form-control"
                    id="patientSearch"
                    placeholder="Type to search patient..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                />

                {searchText && (
                    <ul className="list-group mt-1">
                        {filteredPatients.map((p) => (
                            <li
                                key={p._id}
                                className="list-group-item list-group-item-action"
                                style={{ cursor: "pointer" }}
                                onClick={() => handleSelectPatient(p)}
                            >
                                {p.name} - {p.number}
                            </li>
                        ))}
                        {filteredPatients.length === 0 && (
                            <li className="list-group-item">
                                No patients found
                            </li>
                        )}
                    </ul>
                )}

                {selectedPatient && (
                    <div className="mt-2">
                        <strong>Selected Patient:</strong>{" "}
                        {selectedPatient.name}
                    </div>
                )}
            </div>

            {selectedPatient && (
                <form onSubmit={handleAddAppointment}>
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

                    {/* Services */}
                    <div className="mb-3">
                        <label className="form-label">Services</label>
                        <ServiceList
                            services={allServices}
                            onSelect={(serviceObj, checked) => {
                                setServices((prev) =>
                                    checked
                                        ? [...prev, serviceObj]
                                        : prev.filter(
                                              (s) => s._id !== serviceObj._id
                                          )
                                );
                            }}
                            selectedServices={services}
                        />
                    </div>

                    {services.length > 0 && (
                        <>
                            {/* Service Amount Table */}
                            <div className="mb-3">
                                <label className="form-label">
                                    Bill Details
                                </label>
                                <ul className="list-group mb-2">
                                    {services.map((s) => (
                                        <li
                                            key={s._id}
                                            className="list-group-item d-flex justify-content-between align-items-center"
                                        >
                                            <span>{s.name}</span>
                                            <input
                                                type="number"
                                                className="form-control w-25"
                                                value={
                                                    serviceAmounts[s._id] ??
                                                    s.amount ??
                                                    0
                                                }
                                                onChange={(e) =>
                                                    handleServiceAmountChange(
                                                        s._id,
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* 🔥 DISCOUNT SECTION */}
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

                            {/* Summary Table */}
                            <table className="table table-bordered mb-3">
                                <tbody>
                                    <tr>
                                        <th>Total Before Discount</th>
                                        <td className="text-end">
                                            ₹ {serviceTotal}
                                        </td>
                                    </tr>

                                    <tr>
                                        <th>
                                            Discount{" "}
                                            {isPercent
                                                ? `(${discount}%)`
                                                : discount > 0
                                                ? `(₹${discount})`
                                                : ""}
                                        </th>
                                        <td className="text-end">
                                            ₹{" "}
                                            {(() => {
                                                if (discount <= 0) return 0;
                                                if (isPercent)
                                                    return (
                                                        serviceTotal *
                                                        (discount / 100)
                                                    ).toFixed(2);
                                                return discount;
                                            })()}
                                        </td>
                                    </tr>

                                    <tr className="table-primary fw-bold">
                                        <th>Final Amount</th>
                                        <td className="text-end">
                                            ₹ {finalAmount}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Payment */}
                    <div className="mb-3">
                        <label className="form-label">Payment Type</label>
                        <select
                            className="form-control"
                            value={payment_type}
                            onChange={(e) => setpayment_type(e.target.value)}
                        >
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="btn btn-primary">
                        Save Appointment
                    </button>
                </form>
            )}
        </>
    );
};

export default AddAppointment;