import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import LoadMore from "./LoadMore";
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
    const [allServices, setAllServices] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");
    const [doctor, setDoctor] = useState(null);
    const [limit, setLimit] = useState(10);
    const [total, setTotal] = useState(0);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const IncreaseLimit = () => {
        setLimit((prev) => prev + 10);
    };
    // =========================
    // FETCH ALL APPOINTMENTS
    // =========================
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/auth/fetchallappointments?limit=${limit}`,
                    {
                        headers: {
                            "auth-token": localStorage.getItem("token"),
                        },
                    }
                );

                const data = await res.json();
                setAppointments(data.data || []);
                setTotal(data.total || 0);
            } catch (err) {
                console.error(err);
                setAppointments([]);
            }
        };

        fetchAppointments();
    }, [limit]);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`,
                    {
                        headers: {
                            "auth-token": localStorage.getItem("token"),
                        },
                    }
                );
                const data = await res.json();

                // normalize service names
                setAllServices(
                    Array.isArray(data) ? data.map((s) => s.name).sort() : []
                );
            } catch (err) {
                console.error("Error fetching services", err);
            }
        };

        fetchServices();
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
    const filteredAppointments = useMemo(() => {
        return appointments.filter((a) => {
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
                    selectedServices.includes(
                        typeof s === "object" ? s.name : s
                    )
                );

            return (
                searchMatch &&
                paymentMatch &&
                genderMatch &&
                dateMatch &&
                serviceMatch
            );
        });
    }, [
        appointments,
        searchTerm,
        selectedPayments,
        selectedGender,
        startDate,
        endDate,
        selectedServices,
    ]);

    // ------------------------------------------------------------
    // FETCH DOCTOR DETAILS
    // ------------------------------------------------------------
    const fetchDoctor = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
                headers: { "auth-token": token },
            });
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error("Error fetching doctor:", err);
        }
    };

    useEffect(() => {
        fetchDoctor();
    }, []);

    const hasAnyFilter =
        searchTerm ||
        selectedPayments.length > 0 ||
        selectedServices.length > 0 ||
        selectedGender ||
        startDate ||
        endDate ||
        selectedFY;

    const dataToShow = useMemo(() => {
        return hasAnyFilter ? filteredAppointments : appointments;
    }, [hasAnyFilter, filteredAppointments, appointments]);

    // =========================
    // HELPERS
    // =========================
    // const getMonthKey = (date) =>
    //     new Date(date).toLocaleString("default", {
    //         month: "long",
    //         year: "numeric",
    //     });

    // const getDateKey = (date) => new Date(date).toISOString().split("T")[0];

    // =========================
    // GROUP BY MONTH → DAY
    // =========================
    const appointmentsByMonth = useMemo(() => {
        const grouped = {};

        dataToShow.forEach((a) => {
            const monthKey = new Date(a.date).toLocaleString("default", {
                month: "long",
                year: "numeric",
            });
            const dayKey = new Date(a.date).toISOString().split("T")[0];

            if (!grouped[monthKey]) grouped[monthKey] = {};
            if (!grouped[monthKey][dayKey]) grouped[monthKey][dayKey] = [];

            grouped[monthKey][dayKey].push(a);
        });

        return grouped;
    }, [dataToShow]);

    // =========================
    // EXCEL EXPORT
    // =========================
    const applyFilters = (data) => {
        return data.filter((a) => {
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
                    selectedServices.includes(
                        typeof s === "object" ? s.name : s
                    )
                );

            return (
                searchMatch &&
                paymentMatch &&
                genderMatch &&
                dateMatch &&
                serviceMatch
            );
        });
    };

    const downloadExcel = async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/auth/exportappointments`,
                {
                    headers: {
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const allData = await res.json();

            const filteredForExport = applyFilters(allData);

            if (filteredForExport.length === 0) {
                alert("No data to export");
                return;
            }

            exportToExcel(filteredForExport);
        } catch (err) {
            console.error("Export failed", err);
        }
    };

    const exportToExcel = (data) => {
        if (data.length === 0) return;

        // ✅ sort ALL records by date DESC
        const sorted = [...data].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );

        const rows = [];

        // ===== HEADER =====
        rows.push({ Patient: `Doctor: ${doctor?.name || ""}` });
        rows.push({});

        let currentDay = null;
        let dayTotal = 0;

        sorted.forEach((a, index) => {
            const day = new Date(String(a.date)).toISOString().split("T")[0];

            if (day !== currentDay) {
                if (currentDay !== null) {
                    rows.push({ Payment: "TOTAL", Amount: dayTotal });
                    rows.push({});
                }

                currentDay = day;
                dayTotal = 0;

                rows.push({
                    Patient: new Date(day).toLocaleDateString(),
                });

                rows.push({
                    Patient: "Patient",
                    Number: "Number",
                    Date: "Date",
                    Payment: "Payment",
                    Invoice: "Invoice",
                    Amount: "Amount",
                    Services: "Services",
                });
            }

            dayTotal += Number(a.amount || 0);

            rows.push({
                Patient: a.name,
                Number: a.number || "",
                Date: new Date(String(a.date)).toLocaleDateString(),
                Payment: a.payment_type,
                Invoice: a.invoiceNumber || "",
                Amount: a.amount,
                Services: (a.services || [])
                    .map((s) => (typeof s === "object" ? s.name : s))
                    .join(", "),
            });

            if (index === sorted.length - 1) {
                rows.push({ Payment: "TOTAL", Amount: dayTotal });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Visit Records");

        XLSX.writeFile(wb, "visit-records.xlsx");
    };
    const monthTotals = useMemo(() => {
        const totals = {};

        Object.keys(appointmentsByMonth).forEach((month) => {
            totals[month] = Object.values(appointmentsByMonth[month]).reduce(
                (sum, dayApps) =>
                    sum +
                    dayApps.reduce(
                        (daySum, a) => daySum + Number(a.amount || 0),
                        0
                    ),
                0
            );
        });

        return totals;
    }, [appointmentsByMonth]);

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

                    <label className="fw-semibold">Start Date</label>
                    <input
                        type="date"
                        className="form-control mb-3"
                        value={startDate}
                        onChange={(e) => {
                            setSelectedFY(""); // clear FY when manual date used
                            setStartDate(e.target.value);
                        }}
                    />

                    <label className="fw-semibold">End Date</label>
                    <input
                        type="date"
                        className="form-control mb-3"
                        value={endDate}
                        onChange={(e) => {
                            setSelectedFY(""); // clear FY when manual date used
                            setEndDate(e.target.value);
                        }}
                    />
                    <hr />
                    <label className="fw-semibold">Financial Year</label>
                    <select
                        className="form-select mb-3"
                        value={selectedFY}
                        onChange={(e) => {
                            setSelectedFY(e.target.value);
                        }}
                    >
                        <option value="">All Years</option>
                        <option value="2025">FY 2025-26</option>
                        <option value="2026">FY 2026-27</option>
                        <option value="2027">FY 2027-28</option>
                        <option value="2028">FY 2028-29</option>
                    </select>

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
            <div className="d-flex justify-content-center mb-3">
                <button className="btn btn-success" onClick={downloadExcel}>
                    📥 Download Excel
                </button>
            </div>

            {/* DATA VIEW */}
            {Object.keys(appointmentsByMonth).map((month) => {
                return (
                    <div key={month} className="mb-3">
                        {/* MONTH HEADER WITH TOTAL */}
                        <h4 className="bg-primary text-white p-2 rounded d-flex justify-content-between">
                            <span>{month}</span>
                            <span className="fw-bold">
                                ₹ {monthTotals[month].toFixed(2)}
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
                                                <col
                                                    style={{
                                                        width: "40%",
                                                    }}
                                                />
                                                <col
                                                    style={{
                                                        width: "30%",
                                                    }}
                                                />
                                                <col
                                                    style={{
                                                        width: "30%",
                                                    }}
                                                />
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
                                                        key={`${month}-${day}-${
                                                            a._id || a.patientId
                                                        }-${i}`}
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
            {!hasAnyFilter && appointments.length < total && (
                <LoadMore onLoadMore={IncreaseLimit} />
            )}
            {hasAnyFilter && filteredAppointments.length === 0 && (
                <p className="text-center text-muted mt-3">
                    No records match the selected filters
                </p>
            )}
        </div>
    );
}
