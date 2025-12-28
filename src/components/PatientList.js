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
                    Array.isArray(data.services)
                        ? data.services.map((s) => s.name).sort()
                        : []
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
    const monthTotal = useMemo(() => {
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
    const paymentColor = {
        Cash: "bg-warning-subtle text-dark",
        UPI: "bg-success-subtle text-success",
        Card: "bg-primary-subtle text-primary",
        ICICI: "bg-info-subtle text-info",
        HDFC: "bg-secondary-subtle text-secondary",
        Other: "bg-light text-dark border",
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
            <div
                className="offcanvas offcanvas-end shadow-lg"
                tabIndex="-1"
                id="filterPanel"
            >
                {/* HEADER */}
                <div className="offcanvas-header border-bottom">
                    <h5 className="fw-semibold mb-0">🔍 Filters</h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                    />
                </div>

                {/* BODY */}
                <div className="offcanvas-body">
                    {/* SEARCH */}
                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-muted">
                            Search Patient
                        </label>
                        <input
                            className="form-control rounded-3"
                            placeholder="Name or phone number"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* PAYMENT TYPES */}
                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-muted">
                            Payment Method
                        </label>

                        <div className="d-flex flex-wrap gap-2">
                            {[
                                "Cash",
                                "Card",
                                "UPI",
                                "ICICI",
                                "HDFC",
                                "Other",
                            ].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    className={`btn btn-sm rounded-pill ${
                                        selectedPayments.includes(type)
                                            ? "btn-primary"
                                            : "btn-outline-secondary"
                                    }`}
                                    onClick={() =>
                                        setSelectedPayments(
                                            selectedPayments.includes(type)
                                                ? selectedPayments.filter(
                                                      (p) => p !== type
                                                  )
                                                : [...selectedPayments, type]
                                        )
                                    }
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* GENDER */}
                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-muted">
                            Gender
                        </label>
                        <select
                            className="form-select rounded-3"
                            value={selectedGender}
                            onChange={(e) => setSelectedGender(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <hr />

                    {/* SERVICES */}
                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-muted">
                            Services
                        </label>

                        <div
                            className="d-flex flex-wrap gap-2 border rounded-3 p-2"
                            style={{ maxHeight: 180, overflowY: "auto" }}
                        >
                            {allServices.map((s) => {
                                const active = selectedServices.includes(s);

                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`btn btn-sm rounded-pill ${
                                            active
                                                ? "btn-primary"
                                                : "btn-outline-secondary"
                                        }`}
                                        onClick={() =>
                                            setSelectedServices(
                                                active
                                                    ? selectedServices.filter(
                                                          (x) => x !== s
                                                      )
                                                    : [...selectedServices, s]
                                            )
                                        }
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedServices.length > 0 && (
                            <small className="text-muted d-block mt-2">
                                Selected: {selectedServices.length}
                            </small>
                        )}
                    </div>

                    <hr />

                    {/* DATE RANGE */}
                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-muted">
                            Date Range
                        </label>

                        <div className="row g-2">
                            <div className="col-6">
                                <input
                                    type="date"
                                    className="form-control rounded-3"
                                    value={startDate}
                                    onChange={(e) => {
                                        setSelectedFY("");
                                        setStartDate(e.target.value);
                                    }}
                                />
                            </div>

                            <div className="col-6">
                                <input
                                    type="date"
                                    className="form-control rounded-3"
                                    value={endDate}
                                    onChange={(e) => {
                                        setSelectedFY("");
                                        setEndDate(e.target.value);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* FINANCIAL YEAR */}
                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-muted">
                            Financial Year
                        </label>
                        <select
                            className="form-select rounded-3"
                            value={selectedFY}
                            onChange={(e) => setSelectedFY(e.target.value)}
                        >
                            <option value="">All Years</option>
                            <option value="2025">FY 2025-26</option>
                            <option value="2026">FY 2026-27</option>
                            <option value="2027">FY 2027-28</option>
                            <option value="2028">FY 2028-29</option>
                        </select>
                    </div>

                    {/* ACTIONS */}
                    <div className="d-grid gap-2 mt-4">
                        <button
                            className="btn btn-outline-secondary rounded-3"
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
                            ♻ Reset Filters
                        </button>
                    </div>
                </div>
            </div>
            <div className="d-flex justify-content-center mb-3">
                {localStorage.getItem("role") === "doctor" && (
                    <button className="btn btn-success" onClick={downloadExcel}>
                        📥 Download Excel
                    </button>
                )}
            </div>
            {/* ================= DATA VIEW ================= */}
            {Object.keys(appointmentsByMonth).map((month) => (
                <div key={month} className="container-fluid px-3 px-lg-5 py-3">
                    {/* ================= MONTH HEADER ================= */}
                    <div
                        className="d-flex justify-content-between align-items-center 
                bg-primary bg-gradient text-white 
                rounded-4 px-3 py-3 mb-3 shadow"
                    >
                        <div>
                            <h5 className="mb-0 fw-semibold">{month}</h5>
                            <small className="opacity-75">
                                Total Collection
                            </small>
                        </div>

                        <h4 className="mb-0 fw-bold">
                            ₹ {monthTotal[month]?.toFixed(2)}
                        </h4>
                    </div>

                    {/* ================= DAY LOOP ================= */}
                    {Object.keys(appointmentsByMonth[month]).map((day) => {
                        const dayApps = appointmentsByMonth[month][day];

                        const dayTotal = dayApps.reduce(
                            (sum, a) => sum + Number(a.amount || 0),
                            0
                        );

                        return (
                            <div key={day} className="mb-4">
                                {/* ================= DATE HEADER ================= */}
                                <div className="d-flex justify-content-between align-items-center bg-light rounded-3 px-3 py-2 mb-2">
                                    <h6 className="mb-0 fw-semibold">
                                        {new Date(day).toLocaleDateString(
                                            "en-IN",
                                            {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            }
                                        )}
                                    </h6>

                                    <span className="fw-bold text-success">
                                        ₹ {dayTotal.toFixed(2)}
                                    </span>
                                </div>

                                {/* ================= DESKTOP TABLE ================= */}
                                <div className="d-none d-lg-block">
                                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                                        <table className="table table-hover align-middle mb-0">
                                            <colgroup>
                                                <col style={{ width: "30%" }} />
                                                <col style={{ width: "25%" }} />
                                                <col style={{ width: "25%" }} />
                                                <col style={{ width: "20%" }} />
                                            </colgroup>
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Patient</th>
                                                    <th>Payment</th>
                                                    <th className="text-end">
                                                        Amount
                                                    </th>
                                                    <th></th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {dayApps.map((a, i) => (
                                                    <tr key={i}>
                                                        <td className="fw-semibold">
                                                            {a.name}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`badge rounded-pill ${
                                                                    paymentColor[
                                                                        a
                                                                            .payment_type
                                                                    ] ||
                                                                    "bg-secondary-subtle text-dark"
                                                                }`}
                                                            >
                                                                {a.payment_type}
                                                            </span>
                                                        </td>

                                                        <td className="text-end fw-bold text-success">
                                                            ₹ {a.amount}
                                                        </td>

                                                        <td className="text-end">
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/patient/${a.patientId}`
                                                                    )
                                                                }
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* ================= MOBILE CARDS ================= */}
                                <div className="d-lg-none">
                                    {dayApps.map((a, i) => (
                                        <div
                                            key={i}
                                            className="card border-0 shadow-sm rounded-4 mb-2"
                                            onClick={() =>
                                                navigate(
                                                    `/patient/${a.patientId}`
                                                )
                                            }
                                            style={{ cursor: "pointer" }}
                                        >
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between">
                                                    <div>
                                                        <h6 className="fw-semibold mb-1">
                                                            {a.name}
                                                        </h6>

                                                        <span
                                                            className={`badge rounded-pill ${
                                                                paymentColor[
                                                                    a
                                                                        .payment_type
                                                                ] ||
                                                                "bg-secondary-subtle text-dark"
                                                            }`}
                                                        >
                                                            {a.payment_type}
                                                        </span>
                                                    </div>

                                                    <div className="fw-bold text-success">
                                                        ₹ {a.amount}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}

            {appointments.length < total && (
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
