import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

export default function AppointmentList() {
    const navigate = useNavigate();

    // ALL flattened visits
    const [appointments, setAppointments] = useState([]);

    // FILTER STATES
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");


    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // =========================
    // FETCH ALL APPOINTMENTS
    // =========================
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/auth/fetchallappointments`,
                    {
                        headers: {
                            "auth-token": localStorage.getItem("token"),
                        },
                    }
                );

                const data = await res.json();
                setAppointments(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
                setAppointments([]);
            }
        };

        fetchAppointments();
    }, []);
    useEffect(() => {
    if (!selectedFY) return;

    // Financial year: 1 April → 31 March
    const fyStart = new Date(Number(selectedFY), 3, 1); // April = 3
    const fyEnd = new Date(Number(selectedFY) + 1, 2, 31); // March = 2

    setStartDate(fyStart.toISOString().split("T")[0]);
    setEndDate(fyEnd.toISOString().split("T")[0]);
}, [selectedFY]);

    // =========================
    // APPLY FILTERS
    // =========================
    const filteredAppointments = appointments.filter((a) => {
        const searchMatch =
            a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.number?.includes(searchTerm);

        const paymentMatch =
            !selectedPayment || a.payment_type === selectedPayment;

        const genderMatch = !selectedGender || a.gender === selectedGender;

        const dateMatch =
            (!startDate || new Date(a.date) >= new Date(startDate)) &&
            (!endDate || new Date(a.date) <= new Date(endDate));

        return searchMatch && paymentMatch && genderMatch && dateMatch;
    });

    const hasAnyFilter =
        searchTerm || selectedPayment || selectedGender || startDate || endDate || selectedFY;

    const dataToShow = hasAnyFilter ? filteredAppointments : appointments;

    // =========================
    // HELPERS
    // =========================
    const getMonthKey = (date) =>
        new Date(date).toLocaleString("default", {
            month: "long",
            year: "numeric",
        });

    const getDateKey = (date) => new Date(date).toISOString().split("T")[0];

    const getDayTotal = (apps) =>
        apps.reduce((sum, a) => sum + Number(a.amount || 0), 0);

    // =========================
    // GROUP BY MONTH → DAY
    // =========================
    const appointmentsByMonth = {};

    dataToShow.forEach((a) => {
        const monthKey = getMonthKey(a.date);
        const dayKey = getDateKey(a.date);

        if (!appointmentsByMonth[monthKey]) {
            appointmentsByMonth[monthKey] = {};
        }
        if (!appointmentsByMonth[monthKey][dayKey]) {
            appointmentsByMonth[monthKey][dayKey] = [];
        }

        appointmentsByMonth[monthKey][dayKey].push(a);
    });

    // =========================
    // DOWNLOAD EXCEL (IMAGE MATCH)
    // =========================

    const boldCell = (value) => ({
        v: value,
        s: { font: { bold: true } },
    });

    const downloadExcel = () => {
        if (dataToShow.length === 0) {
            alert("No data to export");
            return;
        }

        const rows = [];
        const useBold = !hasAnyFilter;

        Object.keys(appointmentsByMonth).forEach((month) => {
            const daysObj = appointmentsByMonth[month];

            Object.keys(daysObj)
                .sort((a, b) => new Date(a) - new Date(b))
                .forEach((day) => {
                    const dayApps = daysObj[day];
                    let dayTotal = 0;

                    // ================= DATE ROW =================
                    rows.push({
                        Patient: useBold
                            ? boldCell(new Date(day).toLocaleDateString())
                            : new Date(day).toLocaleDateString(),
                        Number: "",
                        Doctor: "",
                        Date: "",
                        Payment: "",
                        Invoice: "",
                        Amount: "",
                        Services: "",
                    });

                    // ================= HEADER ROW =================
                    rows.push({
                        Patient: useBold ? boldCell("Patient") : "Patient",
                        Number: useBold ? boldCell("Number") : "Number",
                        Doctor: useBold ? boldCell("Doctor") : "Doctor",
                        Date: useBold ? boldCell("Date") : "Date",
                        Payment: useBold ? boldCell("Payment") : "Payment",
                        Invoice: useBold ? boldCell("Invoice") : "Invoice",
                        Amount: useBold ? boldCell("Amount") : "Amount",
                        Services: useBold ? boldCell("Services") : "Services",
                    });

                    // ================= DATA ROWS =================
                    dayApps.forEach((a) => {
                        dayTotal += Number(a.amount || 0);

                        rows.push({
                            Patient: a.name,
                            Number: a.number || "",
                            Doctor: a.doctorName || "abhed",
                            Date: new Date(a.date).toLocaleDateString(),
                            Payment: a.payment_type,
                            Invoice: a.invoiceNumber || "",
                            Amount: a.amount,
                            Services: (a.services || [])
                                .map((s) =>
                                    typeof s === "object" ? s.name : s
                                )
                                .join(", "),
                        });
                    });

                    // ================= TOTAL ROW =================
                    rows.push({
                        Patient: "",
                        Number: "",
                        Doctor: "",
                        Date: "",
                        Payment: "",
                        Invoice: useBold ? boldCell("TOTAL") : "TOTAL",
                        Amount: useBold ? boldCell(dayTotal) : dayTotal,
                        Services: "",
                    });

                    // ================= EMPTY ROW =================
                    rows.push({});
                });
        });

        const worksheet = XLSX.utils.json_to_sheet(rows, {
            skipHeader: true,
        });

        worksheet["!cols"] = [
            { wch: 16 },
            { wch: 14 },
            { wch: 14 },
            { wch: 12 },
            { wch: 12 },
            { wch: 10 },
            { wch: 12 },
            { wch: 30 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Visit Records");

        XLSX.writeFile(workbook, "visit-records.xlsx");
    };

    // =========================
    // UI
    // =========================
    return (
        <div className="container mt-3">
            <h4 className="mb-3">Appointments</h4>

            {/* FILTER BUTTON */}
            <div className="w-75 mx-auto mb-3">
                <button
                    className="btn btn-outline-primary w-100"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#filterPanel"
                >
                    🔍 Filters
                </button>
            </div>

            {/* OFFCANVAS FILTER PANEL */}
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
                    <label>Search</label>
                    <input
                        className="form-control mb-3"
                        placeholder="Name or Phone"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <label>Payment</label>
                    <select
                        className="form-select mb-3"
                        value={selectedPayment}
                        onChange={(e) => setSelectedPayment(e.target.value)}
                    >
                        <option value="">All Payment Types</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="ICICI">ICICI</option>
                        <option value="HDFC">HDFC</option>
                        <option value="Other">Other</option>
                    </select>

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

                    <label>Start Date</label>
                    <input
    type="date"
    className="form-control mb-3"
    value={startDate}
    onChange={(e) => {
        setSelectedFY(""); // 🔑 clear FY
        setStartDate(e.target.value);
    }}
/>

                    <label>End Date</label>
                    <input
    type="date"
    className="form-control mb-3"
    value={endDate}
    onChange={(e) => {
        setSelectedFY(""); // 🔑 clear FY
        setEndDate(e.target.value);
    }}
/>
                    <label>Financial Year</label>
<select
    className="form-select mb-3"
    value={selectedFY}
    onChange={(e) => setSelectedFY(e.target.value)}
>
    <option value="">Select Financial Year</option>
    <option value="2024">FY 2024-25</option>
    <option value="2025">FY 2025-26</option>
    <option value="2026">FY 2026-27</option>
    <option value="2027">FY 2027-28</option>
</select>

                    <button
                        className="btn btn-success w-100 mt-2"
                        data-bs-dismiss="offcanvas"
                    >
                        Apply Filters
                    </button>

                    <button
                        className="btn btn-outline-secondary w-100 mt-2"
                        onClick={() => {
                            setSearchTerm("");
                            setSelectedPayment("");
                            setSelectedGender("");
                            setStartDate("");
                            setEndDate("");
                            setSelectedFY("");
                        }}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            <button className="btn btn-success mb-3" onClick={downloadExcel}>
                📥 Download Excel
            </button>

            {/* MONTH → DAY VIEW */}
            {Object.keys(appointmentsByMonth).map((month) => {
                const daysObj = appointmentsByMonth[month];
                const monthTotal = Object.values(daysObj).reduce(
                    (sum, d) => sum + getDayTotal(d),
                    0
                );

                return (
                    <div key={month} className="mb-5">
                        <h4 className="bg-primary text-white p-2 rounded d-flex justify-content-between">
                            <span>{month}</span>
                            <span>₹ {monthTotal.toFixed(2)}</span>
                        </h4>

                        {Object.keys(daysObj)
                            .sort((a, b) => new Date(b) - new Date(a))
                            .map((day) => {
                                const dayApps = daysObj[day];
                                const dayTotal = getDayTotal(dayApps);

                                return (
                                    <div key={day} className="mb-4">
                                        <h6 className="bg-light p-2 rounded d-flex justify-content-between">
                                            <span>
                                                {new Date(
                                                    day
                                                ).toLocaleDateString()}
                                            </span>
                                            <span>₹ {dayTotal.toFixed(2)}</span>
                                        </h6>

                                        <table className="table table-bordered table-striped">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Gender</th>
                                                    <th>Payment</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dayApps.map((a, i) => (
                                                    <tr
                                                        key={i}
                                                        style={{
                                                            cursor: "pointer",
                                                        }}
                                                        onClick={() =>
                                                            navigate(
                                                                `/patient/${a.patientId}`
                                                            )
                                                        }
                                                    >
                                                        <td>{a.name}</td>
                                                        <td>
                                                            {a.gender || "N/A"}
                                                        </td>
                                                        <td>
                                                            {a.payment_type}
                                                        </td>
                                                        <td>₹ {a.amount}</td>
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
