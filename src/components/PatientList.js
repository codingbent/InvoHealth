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
    // DATE FILTERS
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");

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
    const isDateInRange = (dateKey) => {
        if (dateKey === "No Visits") return false;

        const d = new Date(dateKey);

        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate)) return false;

        return true;
    };
    useEffect(() => {
        if (!selectedFY) return;

        const fyStart = new Date(Number(selectedFY), 3, 1); // 1 April
        const fyEnd = new Date(Number(selectedFY) + 1, 2, 31); // 31 March

        setStartDate(fyStart.toISOString().split("T")[0]);
        setEndDate(fyEnd.toISOString().split("T")[0]);
    }, [selectedFY]);

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
                    const sName = typeof s === "object" ? s.name : String(s);
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
    const resetFilters = () => {
        setSearchTerm("");
        setSelectedService("");
        setSelectedpayment_type("");
        setSelectedGender("");
        setStartDate("");
        setEndDate("");
        setSelectedFY("");
    };

    // =======================
    // TOTAL CALCULATION (FIXED)
    // =======================
    const getDayTotal = (patients) =>
        patients.reduce((sum, p) => {
            const amount =
                p.lastVisit?.amount ??
                p.amount ??
                p.visits?.[p.visits.length - 1]?.amount ??
                0;

            return sum + Number(amount);
        }, 0);

    const getMonthKey = (dateKey) => {
        if (dateKey === "No Visits") return "No Visits";
        const d = new Date(dateKey);
        return d.toLocaleString("default", {
            month: "long",
            year: "numeric",
        });
    };

    // =======================
    // GROUP BY MONTH
    // =======================
    const patientsByMonth = {};

    Object.keys(patientsByDate).forEach((dateKey) => {
        const monthKey = getMonthKey(dateKey);
        if (!patientsByMonth[monthKey]) {
            patientsByMonth[monthKey] = [];
        }
        patientsByMonth[monthKey].push(dateKey);
    });
    // const getFilteredPatientsFlat = () => {
    //     let result = [];

    //     Object.keys(patientsByDate).forEach((dateKey) => {
    //         if (!isDateInRange(dateKey)) return;

    //         const group = applyFilters(patientsByDate[dateKey]);
    //         group.forEach((p) => {
    //             result.push({
    //                 Date: dateKey === "No Visits" ? "" : dateKey,
    //                 Name: p.name,
    //                 Gender: p.gender || "",
    //                 Phone: p.number || "",
    //                 Payment: p.lastpayment_type || "",
    //                 Amount: p.amount || 0,
    //             });
    //         });
    //     });

    //     return result;
    // };

    const getExcelRowsGroupedByDate = () => {
        const rows = [];

        const sortedDates = Object.keys(patientsByDate)
            .filter(isDateInRange)
            .sort((a, b) => new Date(a) - new Date(b));

        sortedDates.forEach((dateKey) => {
            const patients = applyFilters(patientsByDate[dateKey] || []);
            if (patients.length === 0) return;

            // ---------------- DATE ROW ----------------
            rows.push({
                Patient: dateKey,
                Number: "",
                Doctor: "",
                Date: "",
                Payment: "",
                Invoice: "",
                Amount: "",
                Services: "",
            });

            // ---------------- HEADER ROW ----------------
            rows.push({
                Patient: "Patient",
                Number: "Number",
                Doctor: "Doctor",
                Date: "Date",
                Payment: "Payment",
                Invoice: "Invoice",
                Amount: "Amount",
                Services: "Services",
            });

            let dayTotal = 0;

            // ---------------- PATIENT ROWS ----------------
            patients.forEach((p) => {
                const amount =
                    p.lastVisit?.amount ??
                    p.amount ??
                    p.visits?.[p.visits.length - 1]?.amount ??
                    0;

                dayTotal += Number(amount);

                rows.push({
                    Patient: p.name,
                    Number: p.number || "",
                    Doctor: p.doctorName || "",
                    Date: dateKey,
                    Payment: p.lastpayment_type || "N/A",
                    Invoice: p.lastInvoice || "",
                    Amount: amount,
                    Services: (p.service || [])
                        .map((s) => (typeof s === "object" ? s.name : s))
                        .join(", "),
                });
            });

            // ---------------- TOTAL ROW ----------------
            rows.push({
                Patient: "",
                Number: "",
                Doctor: "",
                Date: "",
                Payment: "",
                Invoice: "TOTAL",
                Amount: dayTotal,
                Services: "",
            });

            // ---------------- EMPTY ROW ----------------
            rows.push({});
        });

        return rows;
    };

    const downloadExcel = () => {
        const data = getExcelRowsGroupedByDate();

        if (data.length === 0) {
            alert("No data to export");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(data, {
            skipHeader: true,
        });

        // Column widths (matches your screenshot layout)
        worksheet["!cols"] = [
            { wch: 16 }, // Patient
            { wch: 14 }, // Number
            { wch: 14 }, // Doctor
            { wch: 12 }, // Date
            { wch: 12 }, // Payment
            { wch: 10 }, // Invoice
            { wch: 12 }, // Amount
            { wch: 30 }, // Services
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Visit Records");

        let fileName = "visit-records.xlsx";

        if (selectedFY) {
            fileName = `visit-records_FY_${selectedFY}-${
                Number(selectedFY) + 1
            }.xlsx`;
        } else if (startDate || endDate) {
            fileName = `visit-records_${startDate || "start"}_to_${
                endDate || "end"
            }.xlsx`;
        }

        XLSX.writeFile(workbook, fileName);
    };

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
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    {/* GENDER */}
                    <label>Gender</label>
                    <select
                        className="form-select mb-3"
                        value={selectedGender}
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

                    {/* PAYMENT */}
                    <label>Payment Type</label>
                    <select
                        className="form-select mb-3"
                        value={selectedpayment_type}
                        onChange={(e) =>
                            setSelectedpayment_type(e.target.value)
                        }
                    >
                        <option value="">All Payment Types</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="ICICI">ICICI</option>
                        <option value="HDFC">HDFC</option>
                        <option value="Other">Other</option>
                    </select>

                    {/* DATE RANGE */}
                    <label>Start Date</label>
                    <input
                        type="date"
                        className="form-control mb-3"
                        value={startDate}
                        onChange={(e) => {
                            setSelectedFY("");
                            setStartDate(e.target.value);
                        }}
                    />

                    <label>End Date</label>
                    <input
                        type="date"
                        className="form-control mb-3"
                        value={endDate}
                        onChange={(e) => {
                            setSelectedFY("");
                            setEndDate(e.target.value);
                        }}
                    />

                    {/* FINANCIAL YEAR */}
                    <label>Financial Year</label>
                    <select
                        className="form-select mb-3"
                        value={selectedFY}
                        onChange={(e) => setSelectedFY(e.target.value)}
                    >
                        <option value="">Select FY</option>
                        <option value="2025">FY 2025-26</option>
                        <option value="2026">FY 2026-27</option>
                        <option value="2027">FY 2027-28</option>
                        <option value="2028">FY 2028-29</option>
                        <option value="2029">FY 2029-30</option>
                    </select>
                    <button
                        className="btn btn-success w-100 mt-3"
                        onClick={downloadExcel}
                    >
                        Download Excel
                    </button>
                    <button
                        className="btn btn-outline-secondary w-100 mt-2"
                        onClick={resetFilters}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* PATIENT LIST */}
            {Object.keys(patientsByMonth).map((month) => {
                const monthDates = patientsByMonth[month].filter(isDateInRange);

                const monthTotal = monthDates.reduce((sum, dateKey) => {
                    const group = applyFilters(patientsByDate[dateKey] || []);
                    return sum + getDayTotal(group);
                }, 0);

                if (monthDates.length === 0) return null;

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
