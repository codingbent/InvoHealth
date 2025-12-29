import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { authFetch } from "./authfetch";
import FilterPanel from "./FilterPanel";
import AppointmentList from "./AppointmentList";

export default function PatientList() {
    const navigate = useNavigate();

    // DATA
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true); // initial load
    const [loadingMore, setLoadingMore] = useState(false); // pagination

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
    const limit = 10;
    const [page, setPage] = useState(0);

    const [total, setTotal] = useState(0);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);

        return () => clearTimeout(t);
    }, [searchTerm]);

    const IncreaseLimit = () => {
        setPage((prev) => prev + 1);
    };

    // =========================
    // FETCH ALL APPOINTMENTS
    // =========================

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`
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
    useEffect(() => {
        setPage(0);
    }, [
        debouncedSearch,
        selectedGender,
        selectedPayments,
        selectedServices,
        startDate,
        endDate,
    ]);

    // =========================
    // APPLY FILTERS
    // =========================
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);

                const query = new URLSearchParams({
                    limit,
                    skip: page * limit,
                    search: debouncedSearch,
                    gender: selectedGender,
                    payments: selectedPayments.join(","),
                    services: selectedServices.join(","),
                    startDate,
                    endDate,
                }).toString();

                const res = await authFetch(
                    `${API_BASE_URL}/api/auth/fetchallappointments?${query}`
                );

                const data = await res.json();

                setAppointments((prev) =>
                    page === 0 ? data.data : [...prev, ...data.data]
                );

                setTotal(data.total || 0);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointments();
    }, [
        page,
        debouncedSearch,
        selectedGender,
        selectedPayments,
        selectedServices,
        startDate,
        endDate,
    ]);

    // ------------------------------------------------------------
    // FETCH DOCTOR DETAILS
    // ------------------------------------------------------------
    const fetchDoctor = async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/auth/getdoc`);
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error("Error fetching doctor:", err);
        }
    };

    useEffect(() => {
        fetchDoctor();
    }, []);

    const dataToShow = appointments;

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
            const res = await authFetch(
                `${API_BASE_URL}/api/auth/exportappointments`
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
    useEffect(() => {
  setPage(0);
}, [
  debouncedSearch,
  selectedGender,
  selectedPayments,
  selectedServices,
  startDate,
  endDate,
  selectedFY,
]);

    return (
        <div className="container mt-3">
            {/* FILTERS */}
            <FilterPanel
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedPayments={selectedPayments}
                setSelectedPayments={setSelectedPayments}
                selectedGender={selectedGender}
                setSelectedGender={setSelectedGender}
                allServices={allServices}
                selectedServices={selectedServices}
                setSelectedServices={setSelectedServices}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                selectedFY={selectedFY}
                setSelectedFY={setSelectedFY}
            />

            {/* DOWNLOAD EXCEL */}
            <div className="d-flex justify-content-center mb-3">
                {localStorage.getItem("role") === "doctor" && (
                    <button className="btn btn-success" onClick={downloadExcel}>
                        📥 Download Excel
                    </button>
                )}
            </div>

            {/* APPOINTMENT LIST (MONTH + DAY + LOAD MORE) */}
            <AppointmentList
                appointmentsByMonth={appointmentsByMonth}
                monthTotal={monthTotal}
                paymentColor={paymentColor}
                navigate={navigate}
                appointments={appointments}
                total={total}
                IncreaseLimit={IncreaseLimit}
                loading={loading}
            />
        </div>
    );
}
