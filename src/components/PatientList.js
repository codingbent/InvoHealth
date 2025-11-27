import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientDetails from "./PatientDetails";
import * as XLSX from "xlsx";

export default function PatientList() {
    const navigate = useNavigate();
    const [patientsByDate, setPatientsByDate] = useState({});
    const [services, setServices] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedService, setSelectedService] = useState("");
    const [selectedpayment_type, setSelectedpayment_type] = useState("");

    const [selectedGender, setSelectedGender] = useState(""); // ✅ GENDER FILTER HERE

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // Delete patient
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this patient?"))
            return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/deletepatient/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const data = await response.json();
            if (data.success) {
                alert("Patient deleted successfully!");
                fetchPatients();
            } else {
                alert(data.message || "Failed to delete patient");
            }
        } catch (err) {
            console.error("Error deleting patient:", err);
            alert("Server error while deleting patient");
        }
    };

    const fetchPatients = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/fetchallpatients`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const patients = await response.json();

            const grouped = patients.reduce((acc, p) => {
                const dateKey = p.lastAppointment
                    ? new Date(p.lastAppointment).toISOString().split("T")[0]
                    : "No Visits";

                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(p);
                return acc;
            }, {});

            setPatientsByDate(grouped);
        } catch (err) {
            console.error("Error fetching patients:", err);
            setPatientsByDate({});
        }
    };

    const fetchServices = async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/fetchallservice`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const data = await response.json();
            if (Array.isArray(data)) {
                setServices(data);
            } else {
                console.error("Expected array, got:", data);
                setServices([]);
            }
        } catch (err) {
            console.error("Error fetching services:", err);
            setServices([]);
        }
    };

    useEffect(() => {
        fetchPatients();
        fetchServices();
    }, [API_BASE_URL]);

    // ==========================
    // APPLY FILTER LOGIC
    // ==========================
    const applyFilters = (patients) => {
        return patients.filter((p) => {
            const matchSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.number?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchService =
                !selectedService ||
                p.service?.some((s) => {
                    if (!s) return false;
                    if (typeof s === "string")
                        return (
                            s.toLowerCase() === selectedService.toLowerCase()
                        );

                    if (typeof s === "object") {
                        const serviceName = s.name || s.service_name || "";
                        return (
                            serviceName.toLowerCase() ===
                            selectedService.toLowerCase()
                        );
                    }
                    return false;
                });

            const matchPayment =
                !selectedpayment_type ||
                (p.lastpayment_type &&
                    p.lastpayment_type.toLowerCase() ===
                        selectedpayment_type.toLowerCase());

            const matchGender =
                !selectedGender ||
                (p.gender &&
                    p.gender.toLowerCase() === selectedGender.toLowerCase());

            return matchSearch && matchService && matchPayment && matchGender; // ✅ Added gender check
        });
    };

    // ==========================
    // 📥 DOWNLOAD FILTERED EXCEL
    // ==========================
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
                        Gender: p.gender || "N/A", // ✅ Gender added to Excel
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

    return (
        <>
            <div className="container mt-3">
                {/* <button
                    className="btn btn-primary"
                    onClick={downloadFilteredExcel}
                >
                    📥 Download Filtered Excel
                </button> */}

                {/* Search */}
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Search by name or phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Gender filter */}
                <select
                    className="form-select mb-2"
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                >
                    <option value="">All Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                </select>

                {/* Service filter */}
                <select
                    className="form-select mb-2"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                >
                    <option value="">All Services</option>
                    {services.map((s) => (
                        <option key={s._id} value={s.name}>
                            {s.name}
                        </option>
                    ))}
                </select>

                {/* Payment filter */}
                <select
                    className="form-select mb-3"
                    value={selectedpayment_type}
                    onChange={(e) => setSelectedpayment_type(e.target.value)}
                >
                    <option value="">All Payment Types</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                </select>

                {/* GROUP BY DATE */}
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

                                <table className="table table-striped table-bordered">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Name</th>
                                            <th>Number</th>
                                            <th>Gender</th> {/* NEW COLUMN */}
                                            <th>Payment</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {group.map((p) => (
                                            <tr
                                                key={p._id}
                                                style={{ cursor: "pointer" }}
                                                onClick={() =>
                                                    navigate(
                                                        `/patient/${p._id}`
                                                    )
                                                }
                                            >
                                                <td>{p.name}</td>
                                                <td>{p.number}</td>
                                                <td>{p.gender || "N/A"}</td>
                                                <td>
                                                    {p.lastpayment_type ||
                                                        "N/A"}
                                                </td>

                                                <td>
                                                    <button
                                                        className="btn btn-danger btn-sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(p._id);
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
        </>
    );
}
