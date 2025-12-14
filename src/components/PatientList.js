import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

export default function PatientList() {
    const navigate = useNavigate();

    // DATA
    const [appointments, setAppointments] = useState([]);

    // FILTER STATES
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
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

    // =========================
    // FINANCIAL YEAR LOGIC
    // =========================
    useEffect(() => {
        if (!selectedFY) return;

        const fyStart = new Date(Number(selectedFY), 3, 1);
        const fyEnd = new Date(Number(selectedFY) + 1, 2, 31);

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
            selectedPayments.length === 0 ||
            selectedPayments.includes(a.payment_type);

        const genderMatch = !selectedGender || a.gender === selectedGender;

        const dateMatch =
            (!startDate || new Date(a.date) >= new Date(startDate)) &&
            (!endDate || new Date(a.date) <= new Date(endDate));

        const serviceMatch =
            selectedServices.length === 0 ||
            (a.services || []).some((s) =>
                selectedServices.includes(typeof s === "object" ? s.name : s)
            );

        return (
            searchMatch &&
            paymentMatch &&
            genderMatch &&
            dateMatch &&
            serviceMatch
        );
    });

    const hasAnyFilter =
        searchTerm ||
        selectedPayments.length > 0 ||
        selectedServices.length > 0 ||
        selectedGender ||
        startDate ||
        endDate ||
        selectedFY;

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
    // SERVICES LIST (DYNAMIC)
    // =========================
    const allServices = Array.from(
        new Set(
            appointments.flatMap((a) =>
                (a.services || []).map((s) =>
                    typeof s === "object" ? s.name : s
                )
            )
        )
    ).sort();

    // =========================
    // EXCEL EXPORT
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
                    });

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
                        Payment: useBold ? boldCell("TOTAL") : "TOTAL",
                        Amount: useBold ? boldCell(dayTotal) : dayTotal,
                        Services: "",
                    });

                    // ================= EMPTY ROW =================
                    rows.push({});
                });
        });

        const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Visit Records");

        XLSX.writeFile(wb, "visit-records.xlsx");
    };

    // =========================
    // UI
    // =========================
    return (
        <div className="container mt-3">
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

            {/* FILTER PANEL */}
            <div className="offcanvas offcanvas-end" id="filterPanel">
                <div className="offcanvas-header">
                    <h5>Filters</h5>
                    <button className="btn-close" data-bs-dismiss="offcanvas" />
                </div>

                <div className="offcanvas-body">
                    <label>Search</label>
                    <input
                        className="form-control mb-3"
                        placeholder="Search name or phone"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <label className="fw-semibold">Payment Types</label>
                    {["Cash", "Card", "UPI", "ICICI", "HDFC", "Other"].map(
                        (type) => (
                            <div className="form-check" key={type}>
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedPayments.includes(type)}
                                    onChange={(e) =>
                                        setSelectedPayments(
                                            e.target.checked
                                                ? [...selectedPayments, type]
                                                : selectedPayments.filter(
                                                      (p) => p !== type
                                                  )
                                        )
                                    }
                                />
                                <label className="form-check-label">
                                    {type}
                                </label>
                            </div>
                        )
                    )}
                    <label className="fw-semibold mt-2">Gender</label>
                    <select
                        className="form-select mb-3"
                        value={selectedGender}
                        onChange={(e) => setSelectedGender(e.target.value)}
                    >
                        <option value="">All</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>

                    <hr />

                    <label className="fw-semibold">Services</label>
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                        {allServices.map((s) => (
                            <div className="form-check" key={s}>
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={selectedServices.includes(s)}
                                    onChange={(e) =>
                                        setSelectedServices(
                                            e.target.checked
                                                ? [...selectedServices, s]
                                                : selectedServices.filter(
                                                      (x) => x !== s
                                                  )
                                        )
                                    }
                                />
                                <label className="form-check-label">{s}</label>
                            </div>
                        ))}
                    </div>

                    <hr />

                    <button
                        className="btn btn-outline-secondary w-100 mt-2"
                        onClick={() => {
                            setSearchTerm("");
                            setSelectedPayments([]);
                            setSelectedServices([]);
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
            <div className="justify-content-center">
                <button
                    className="btn btn-success mb-3"
                    onClick={downloadExcel}
                >
                    📥 Download Excel
                </button>
            </div>

            {/* DATA VIEW */}
            {Object.keys(appointmentsByMonth).map((month) => {
                const monthTotal = Object.values(
                    appointmentsByMonth[month]
                ).reduce(
                    (sum, dayApps) =>
                        sum +
                        dayApps.reduce(
                            (daySum, a) => daySum + Number(a.amount || 0),
                            0
                        ),
                    0
                );

                return (
                    <div key={month} className="mb-5">
                        {/* MONTH HEADER WITH TOTAL */}
                        <h4 className="bg-primary text-white p-2 rounded d-flex justify-content-between">
                            <span>{month}</span>
                            <span className="fw-bold">
                                ₹ {monthTotal.toFixed(2)}
                            </span>
                        </h4>

                        {Object.keys(appointmentsByMonth[month])
                            .sort((a, b) => new Date(b) - new Date(a))
                            .map((day) => {
                                const dayApps = appointmentsByMonth[month][day];
                                const dayTotal = dayApps.reduce(
                                    (sum, a) => sum + Number(a.amount || 0),
                                    0
                                );

                                return (
                                    <div key={day}>
                                        {/* DAY HEADER WITH TOTAL */}
                                        <h6 className="bg-light p-2 d-flex justify-content-between">
                                            <span>
                                                {new Date(
                                                    day
                                                ).toLocaleDateString()}
                                            </span>
                                            <span className="fw-semibold">
                                                ₹ {dayTotal.toFixed(2)}
                                            </span>
                                        </h6>

                                        <table className="table table-bordered table-striped">
                                            {/* COLUMN WIDTHS */}
                                            <colgroup>
                                                <col style={{ width: "40%" }} />
                                                <col style={{ width: "30%" }} />
                                                <col style={{ width: "30%" }} />
                                            </colgroup>

                                            {/* TABLE HEADER */}
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Payment</th>
                                                    <th>Amount</th>
                                                </tr>
                                            </thead>

                                            {/* TABLE BODY */}
                                            <tbody>
                                                {dayApps.map((a, i) => (
                                                    <tr
                                                        key={i}
                                                        onClick={() =>
                                                            navigate(
                                                                `/patient/${a.patientId}`
                                                            )
                                                        }
                                                        style={{
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        <td>{a.name}</td>
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
