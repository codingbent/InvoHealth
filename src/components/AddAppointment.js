import { useState, useEffect } from "react";
import ServiceList from "./ServiceList";

const AddAppointment = (props) => {
    const [patientsList, setPatientsList] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [amount, setAmount] = useState(0);
    const [searchText, setSearchText] = useState("");
    const [selectedPatient, setSelectedPatient] = useState(
        localStorage.getItem("patient")
            ? JSON.parse(localStorage.getItem("patient"))
            : null
    );
    const [paymentType, setPaymentType] = useState("cash"); // ✅
    const [allServices, setAllServices] = useState([]);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

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

    useEffect(() => {
        const filtered = patientsList.filter((p) =>
            p.name.toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredPatients(filtered);
    }, [searchText, patientsList]);

    useEffect(() => {
        const total = services.reduce(
            (acc, s) => acc + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0
        );
        setAmount(total);
    }, [services, serviceAmounts]);

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
                        amount,
                        payment_type: paymentType, // ✅ include
                    }),
                }
            );

            const result = await res.json();

            if (res.ok && result.success) {
                props.showAlert("Appointment added successfully!", "success");
                setServices([]);
                setServiceAmounts({});
                setAmount(0);
                setSelectedPatient(null);
                localStorage.removeItem("patient");
                setPaymentType("cash");
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
                    <div className="mb-3">
                        <label className="form-label">Services</label>
                        <ServiceList
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
                        <div className="mb-3">
                            <label className="form-label">Bill Details</label>
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
                            <label className="form-label">Total Amount</label>
                            <input
                                type="number"
                                className="form-control"
                                value={amount}
                                readOnly
                            />
                        </div>
                    )}

                    {/* Payment Type */}
                    <div className="mb-3">
                        <label className="form-label">Payment Type</label>
                        <select
                            className="form-control"
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.target.value)}
                        >
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="upi">UPI</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <button type="submit" className="btn btn-primary">
                        Save Appointment
                    </button>
                </form>
            )}
        </>
    );
};

export default AddAppointment;
