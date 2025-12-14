import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

export default function PatientList() {
    const navigate = useNavigate();
    const [patientsByDate, setPatientsByDate] = useState({});
    const [services, setServices] = useState([]);

    // FILTER STATES
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedService, setSelectedService] = useState("");
    const [selectedpayment_type, setSelectedpayment_type] = useState("");
    const [selectedGender, setSelectedGender] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // =======================
    // Delete patient
    // =======================
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure?")) return;

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/auth/deletepatient/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const data = await res.json();
            if (data.success) fetchPatients();
            else alert(data.message || "Failed to delete patient");
        } catch (err) {
            console.error(err);
        }
    };

    // =======================
    // Fetch Patients
    // =======================
    const fetchPatients = async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/auth/fetchallpatients`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const patients = await res.json();

            const grouped = patients.reduce((acc, p) => {
                const dateKey = p.lastAppointment
                    ? new Date(p.lastAppointment).toISOString().split("T")[0]
                    : "No Visits";

                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(p);
                return acc;
            }, {});

            setPatientsByDate(grouped);
        } catch {
            setPatientsByDate({});
        }
    };

    // =======================
    // Fetch Services
    // =======================
    const fetchServices = async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/auth/fetchallservice`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const data = await res.json();
            if (Array.isArray(data)) setServices(data);
        } catch {
            setServices([]);
        }
    };

    useEffect(() => {
        fetchPatients();
        fetchServices();
    }, []);

    // =======================
    // APPLY FILTERS
    // =======================
    const applyFilters = (patients) =>
        patients.filter((p) => {
            const searchMatch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.number?.includes(searchTerm);

            const genderMatch =
                !selectedGender ||
                (p.gender || "").toLowerCase() === selectedGender.toLowerCase();

            const serviceMatch =
                !selectedService ||
                p.service?.some((s) => {
                    const sName =
                        typeof s === "object" ? s.name : (s || "").toString();
                    return (
                        sName.toLowerCase() === selectedService.toLowerCase()
                    );
                });

            const paymentMatch =
                !selectedpayment_type ||
                (p.lastpayment_type || "").toLowerCase() ===
                    selectedpayment_type.toLowerCase();

            return searchMatch && genderMatch && serviceMatch && paymentMatch;
        });

    // =======================
    // Calculate totals
    // =======================
    const getDayTotal = (patients) =>
        patients.reduce((sum, p) => sum + (Number(p.lastAmount) || 0), 0);

    const getMonthKey = (dateKey) => {
        if (dateKey === "No Visits") return "No Visits";
        const d = new Date(dateKey);
        return d.toLocaleString("default", {
            month: "long",
            year: "numeric",
        });
    };

    // =======================
    // Group by month
    // =======================
    const patientsByMonth = {};

    Object.keys(patientsByDate).forEach((dateKey) => {
        const monthKey = getMonthKey(dateKey);
        if (!patientsByMonth[monthKey]) {
            patientsByMonth[monthKey] = [];
        }
        patientsByMonth[monthKey].push(dateKey);
    });

    // =======================
    // UI RENDER
    // =======================
    return (
        <div className="container mt-3">
            {/* FILTER BUTTON */}
            <div className="w-75 mx-auto mb-3">
                <button
                    className="btn btn-outline-primary w-100"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#filterPanel"
                >
                    Filters
                </button>
            </div>

            {/* PATIENT LIST */}
            {Object.keys(patientsByMonth).map((month) => {
                const monthDates = patientsByMonth[month];

                const monthTotal = monthDates.reduce((sum, dateKey) => {
                    const group = applyFilters(patientsByDate[dateKey] || []);
                    return sum + getDayTotal(group);
                }, 0);

                if (monthTotal === 0) return null;

                return (
                    <div key={month} className="mb-5">
                        {/* MONTH HEADER */}
                        <h4 className="bg-primary text-white p-2 rounded d-flex justify-content-between">
                            <span>{month}</span>
                            <span>₹ {monthTotal.toFixed(2)}</span>
                        </h4>

                        {monthDates
                            .sort((a, b) => new Date(b) - new Date(a))
                            .map((date) => {
                                const group = applyFilters(
                                    patientsByDate[date] || []
                                );
                                if (group.length === 0) return null;

                                const dayTotal = getDayTotal(group);

                                return (
                                    <div key={date} className="mb-4">
                                        {/* DAY HEADER */}
                                        <h6 className="bg-light p-2 rounded d-flex justify-content-between">
                                            <span>
                                                {date === "No Visits"
                                                    ? "No Visits Yet"
                                                    : new Date(
                                                          date
                                                      ).toLocaleDateString()}
                                            </span>
                                            <span className="fw-bold">
                                                ₹ {dayTotal.toFixed(2)}
                                            </span>
                                        </h6>

                                        <table className="table table-striped table-bordered">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Gender</th>
                                                    <th>Payment</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.map((p) => (
                                                    <tr
                                                        key={p._id}
                                                        style={{
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() =>
                                                            navigate(
                                                                `/patient/${p._id}`
                                                            )
                                                        }
                                                    >
                                                        <td>{p.name}</td>
                                                        <td>
                                                            {p.gender || "N/A"}
                                                        </td>
                                                        <td>
                                                            {p.lastpayment_type ||
                                                                "N/A"}
                                                        </td>
                                                        <td>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(
                                                                        p._id
                                                                    );
                                                                }}
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                    </div>
                );
            })}
        </div>
    );
}
