import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

export default function AppointmentList() {
    const navigate = useNavigate();

    // ALL appointments (flattened visits)
    const [appointments, setAppointments] = useState([]);

    // FILTER STATES
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

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

    // =========================
    // APPLY FILTERS
    // =========================
    const filteredAppointments = appointments.filter((a) => {
        const searchMatch =
            a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.number?.includes(searchTerm);

        const paymentMatch =
            !selectedPayment || a.payment_type === selectedPayment;

        const genderMatch =
            !selectedGender || a.gender === selectedGender;

        const dateMatch =
            (!startDate || new Date(a.date) >= new Date(startDate)) &&
            (!endDate || new Date(a.date) <= new Date(endDate));

        return searchMatch && paymentMatch && genderMatch && dateMatch;
    });

    const hasAnyFilter =
        searchTerm || selectedPayment || selectedGender || startDate || endDate;

    const dataToShow = hasAnyFilter
        ? filteredAppointments
        : appointments;

    // =========================
    // HELPERS
    // =========================
    const getMonthKey = (date) =>
        new Date(date).toLocaleString("default", {
            month: "long",
            year: "numeric",
        });

    const getDateKey = (date) =>
        new Date(date).toISOString().split("T")[0];

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
    // DOWNLOAD EXCEL
    // =========================
    const downloadExcel = () => {
        if (dataToShow.length === 0) {
            alert("No data to export");
            return;
        }

        const rows = dataToShow.map((a) => ({
            Name: a.name,
            Number: a.number || "",
            Gender: a.gender || "",
            Date: new Date(a.date).toLocaleDateString(),
            Payment: a.payment_type,
            Amount: a.amount,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Appointments");

        XLSX.writeFile(wb, "Visit-Records.xlsx");
    };

    // =========================
    // UI
    // =========================
    return (
        <div className="container mt-3">
            <h4 className="mb-3">Appointments</h4>

            {/* FILTERS */}
            <input
                className="form-control mb-2"
                placeholder="Search by name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
                className="form-select mb-2"
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

            <div className="row mb-3">
                <div className="col">
                    <input
                        type="date"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="col">
                    <input
                        type="date"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            <button className="btn btn-success mb-3" onClick={downloadExcel}>
                📥 Download Excel
            </button>

            {/* MONTH + DAY GROUPED VIEW */}
            {Object.keys(appointmentsByMonth).map((month) => {
                const daysObj = appointmentsByMonth[month];
                const monthTotal = Object.values(daysObj).reduce(
                    (sum, dayApps) => sum + getDayTotal(dayApps),
                    0
                );

                return (
                    <div key={month} className="mb-5">
                        {/* MONTH HEADER */}
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
                                        {/* DAY HEADER */}
                                        <h6 className="bg-light p-2 rounded d-flex justify-content-between">
                                            <span>
                                                {new Date(
                                                    day
                                                ).toLocaleDateString()}
                                            </span>
                                            <span className="fw-bold">
                                                ₹ {dayTotal.toFixed(2)}
                                            </span>
                                        </h6>

                                        <table className="table table-bordered table-striped">
                                            <thead className="table-light">
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
                                                        <td>
                                                            ₹ {a.amount}
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
