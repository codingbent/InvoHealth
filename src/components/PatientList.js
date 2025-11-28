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

    // =====================================================
    //  MAKE FILTER SETTERS ACCESSIBLE TO OFFCANVAS
    // =====================================================
    useEffect(() => {
        window.setSearchTerm = setSearchTerm;
        window.setSelectedGender = setSelectedGender;
        window.setSelectedService = setSelectedService;
        window.setSelectedPaymentType = setSelectedpayment_type;
        window.services = services;
    }, [services]);

    // =====================================================
    // DOWNLOAD EXCEL (Filtered)
    // =====================================================
    const downloadFilteredExcel = () => {
        let finalRows = [];

        Object.keys(patientsByDate)
            .sort((a, b) => new Date(a) - new Date(b))
            .forEach((dateKey) => {
                const group = applyFilters(patientsByDate[dateKey] || []);
                if (group.length === 0) return;

                group.forEach((p) => {
                    finalRows.push({
                        Date:
                            dateKey === "No Visits"
                                ? "No Visits"
                                : new Date(dateKey).toLocaleDateString(),
                        Name: p.name,
                        Number: p.number,
                        Gender: p.gender || "N/A",
                        Payment: p.lastpayment_type || "N/A",
                    });
                });
            });

        if (finalRows.length === 0) {
            alert("No records to download.");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(finalRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Patients");

        XLSX.writeFile(workbook, "Filtered-Patients.xlsx");
    };

    // =====================================================
    // UI RENDER
    // =====================================================
    return (
        <>
            <div className="container mt-3">
                {/* ----------- FILTER BUTTON ---------- */}
                <div className="w-75 mx-auto mb-3">
                    <button
                        className="btn btn-outline-primary w-100"
                        data-bs-toggle="offcanvas"
                        data-bs-target="#filterPanel"
                    >
                        Filters
                    </button>
                </div>

                {/* =============== OFFCANVAS FILTER PANEL =============== */}
                <div
                    className="offcanvas offcanvas-end"
                    tabIndex="-1"
                    id="filterPanel"
                >
                    <div className="offcanvas-header">
                        <h5>Filters</h5>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                        ></button>
                    </div>

                    <div className="offcanvas-body">
                        {/* SEARCH */}
                        <label>Search</label>
                        <input
                            className="form-control mb-3"
                            placeholder="Name or Phone"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                        {/* GENDER */}
                        <label>Gender</label>
                        <select
                            className="form-select mb-3"
                            onChange={(e) => setSelectedGender(e.target.value)}
                        >
                            <option value="">All Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>

                        {/* SERVICES */}
                        <label>Services</label>
                        <select
                            className="form-select mb-3"
                            onChange={(e) => setSelectedService(e.target.value)}
                        >
                            <option value="">All Services</option>
                            {services.map((s) => (
                                <option key={s._id} value={s.name}>
                                    {s.name}
                                </option>
                            ))}
                        </select>

                        {/* PAYMENT */}
                        <label>Payment Type</label>
                        <select
                            className="form-select mb-3"
                            onChange={(e) =>
                                setSelectedpayment_type(e.target.value)
                            }
                        >
                            <option value="">All Payment Types</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                        </select>

                        <button
                            className="btn btn-primary w-100"
                            data-bs-dismiss="offcanvas"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>

                {/* ===================================================
                    PATIENT LIST
                =================================================== */}
                {Object.keys(patientsByDate)
                    .sort((a, b) => new Date(b) - new Date(a))
                    .map((date) => {
                        const group = applyFilters(patientsByDate[date] || []);
                        if (group.length === 0) return null;

                        return (
                            <div key={date} className="mb-4">
                                <h5 className="bg-light p-2 rounded">
                                    {date === "No Visits"
                                        ? "No Visits Yet"
                                        : new Date(date).toLocaleDateString()}
                                </h5>

                                <div className="table-responsive patient-table-wrapper">
                                    <table className="table patient-table table-bordered table-fixed">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Number</th>
                                                <th>Gender</th>
                                                <th>Payment</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {group.map((p) => (
                                                <tr key={p._id}>
                                                    <td>{p.name}</td>
                                                    <td>{p.number}</td>
                                                    <td>{p.gender || "N/A"}</td>
                                                    <td>
                                                        {p.lastpayment_type ||
                                                            "N/A"}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-danger btn-sm w-100"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    p._id
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
                                </div>
                            </div>
                        );
                    })}
            </div>
        </>
    );
}
