import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { authFetch } from "./authfetch";
import FilterPanel from "./FilterPanel";
import AppointmentList from "./AppointmentList";
import { SlidersHorizontal } from "lucide-react";
import { FileSpreadsheet } from "lucide-react";

export default function PatientList() {
    const navigate = useNavigate();

    // =============================
    // STATE
    // =============================
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [allServices, setAllServices] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");
    const [doctor, setDoctor] = useState(null);
    const [page, setPage] = useState(0);
    const [filterOpen, setFilterOpen] = useState(false);
    const [total, setTotal] = useState(0);

    const limit = 10;

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // =============================
    // FILTER COUNT (for badge)
    // =============================
    const activeFiltersCount =
        selectedPayments.length +
        selectedStatus.length +
        selectedServices.length +
        (selectedGender ? 1 : 0) +
        (startDate || endDate ? 1 : 0) +
        (selectedFY ? 1 : 0);

    // =============================
    // DEBOUNCED SEARCH
    // =============================
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        setDoctor(localStorage.getItem("name"));
    }, []);
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    // =============================
    // FETCH SERVICES
    // =============================
    const fetchServices = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/services/fetchall_services`,
            );
            const data = await res.json();

            setAllServices(
                Array.isArray(data.services)
                    ? data.services.map((s) => s.name).sort()
                    : [],
            );
        } catch (err) {
            console.error("Error fetching services", err);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    // =============================
    // FETCH APPOINTMENTS
    // =============================
    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);

            const query = new URLSearchParams({
                limit,
                skip: page * limit,
                search: debouncedSearch.toLowerCase(),
                gender: selectedGender,
                payments: selectedPayments.join(","),
                status: selectedStatus.join(","),
                services: selectedServices.join(","),
                startDate,
                endDate,
            }).toString();

            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/fetchall_appointments?${query}`,
            );

            const data = await res.json();

            setAppointments((prev) =>
                page === 0 ? data.data : [...prev, ...data.data],
            );

            setTotal(data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [
        page,
        debouncedSearch,
        selectedGender,
        selectedPayments,
        selectedStatus,
        selectedServices,
        startDate,
        endDate,
        API_BASE_URL,
    ]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [
        debouncedSearch,
        selectedGender,
        selectedPayments,
        selectedStatus,
        selectedServices,
        startDate,
        endDate,
        selectedFY,
    ]);

    // =============================
    // GROUP BY MONTH
    // =============================
    const appointmentsByMonth = useMemo(() => {
        const grouped = {};

        appointments.forEach((a) => {
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
    }, [appointments]);

    const applyFilters = (data) => {
        return data.filter((a) => {
            const searchMatch =
                a.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                a.number?.includes(debouncedSearch);

            const paymentMatch =
                selectedPayments.length === 0 ||
                selectedPayments.includes(a.payment_type);

            const statusMatch =
                selectedStatus.length === 0 ||
                selectedStatus.includes(a.status);

            const genderMatch = !selectedGender || a.gender === selectedGender;

            const dateMatch =
                (!startDate || new Date(a.date) >= new Date(startDate)) &&
                (!endDate || new Date(a.date) <= new Date(endDate));

            const serviceMatch =
                selectedServices.length === 0 ||
                (a.services || []).some((s) =>
                    selectedServices.includes(
                        typeof s === "object" ? s.name : s,
                    ),
                );

            return (
                searchMatch &&
                paymentMatch &&
                statusMatch &&
                genderMatch &&
                dateMatch &&
                serviceMatch
            );
        });
    };

    const downloadExcel = async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/export_appointments`,
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

    const exportToExcel = async (data) => {
        if (!data.length) return;

        const sorted = [...data].sort(
            (a, b) => new Date(b.date) - new Date(a.date),
        );

        const fromDate = new Date(
            sorted[sorted.length - 1].date,
        ).toLocaleDateString("en-GB");

        const toDate = new Date(sorted[0].date).toLocaleDateString("en-GB");

        // ================= FINANCIAL SUMMARY =================
        let totalRevenue = 0;
        let totalCollected = 0;
        let totalPending = 0;
        let paidCount = 0;
        let partialCount = 0;
        let unpaidCount = 0;

        const paymentSummary = {};

        sorted.forEach((a) => {
            const billed = Number(a.amount ?? 0);
            const collected = Number(a.collected ?? 0);
            const remaining = Number(a.remaining ?? billed - collected);

            totalRevenue += billed;
            totalCollected += collected;
            totalPending += remaining > 0 ? remaining : 0;

            if (remaining <= 0) paidCount++;
            else if (collected > 0) partialCount++;
            else unpaidCount++;

            const key = a.payment_type || "Other";
            paymentSummary[key] = (paymentSummary[key] || 0) + collected;
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Visit Records");

        // ================= HEADER =================
        sheet.addRow([`Doctor:`, `${doctor || ""}`]).font = { bold: true };
        sheet.addRow(["From", fromDate]);
        sheet.addRow(["To", toDate]);
        sheet.addRow([]);

        sheet.addRow(["TOTAL REVENUE", totalRevenue]).font = { bold: true };
        sheet.addRow(["TOTAL COLLECTED", totalCollected]).font = { bold: true };
        sheet.addRow(["TOTAL PENDING", totalPending]).font = { bold: true };
        sheet.addRow([]);

        sheet.addRow(["Paid Visits", paidCount]);
        sheet.addRow(["Partial Visits", partialCount]);
        sheet.addRow(["Unpaid Visits", unpaidCount]);
        sheet.addRow([]);

        sheet.addRow(["COLLECTION SUMMARY"]).font = { bold: true };

        Object.entries(paymentSummary).forEach(([type, amount]) => {
            sheet.addRow([type, amount]);
        });

        sheet.addRow([]);

        // ================= DAILY TABLE =================
        let currentDay = null;
        let dayCollectedTotal = 0;

        sorted.forEach((a, index) => {
            const day = new Date(a.date).toISOString().split("T")[0];

            const billed = Number(a.amount ?? 0);
            const collected = Number(a.collected ?? billed);
            const remaining = billed - collected;

            const status =
                remaining <= 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

            if (day !== currentDay) {
                if (currentDay !== null) {
                    sheet.addRow([
                        "",
                        "",
                        "",
                        "",
                        "DAY TOTAL (Collected)",
                        dayCollectedTotal,
                    ]).font = {
                        bold: true,
                    };
                    sheet.addRow([]);
                }

                currentDay = day;
                dayCollectedTotal = 0;

                sheet.addRow([new Date(day).toLocaleDateString("en-GB")]).font =
                    {
                        bold: true,
                    };

                sheet.addRow([
                    "Patient",
                    "Number",
                    "Date",
                    "Payment",
                    "Billed",
                    "Collected",
                    "Remaining",
                    "Status",
                    "Invoice",
                    "Services",
                ]).font = { bold: true };
            }

            dayCollectedTotal += collected;

            sheet.addRow([
                a.name,
                a.number || "",
                new Date(a.date).toLocaleDateString("en-GB"),
                a.payment_type,
                billed,
                collected,
                remaining,
                status,
                a.invoiceNumber || "",
                (a.services || [])
                    .map((s) => (typeof s === "object" ? s.name : s))
                    .join(", "),
            ]);

            if (index === sorted.length - 1) {
                sheet.addRow([
                    "",
                    "",
                    "",
                    "",
                    "DAY TOTAL (Collected)",
                    dayCollectedTotal,
                ]).font = {
                    bold: true,
                };
            }
        });

        sheet.columns.forEach((col) => (col.width = 18));

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), "clinic-records.xlsx");
    };

    const monthTotal = useMemo(() => {
        const totals = {};

        Object.keys(appointmentsByMonth).forEach((month) => {
            totals[month] = Object.values(appointmentsByMonth[month]).reduce(
                (sum, dayApps) =>
                    sum +
                    dayApps.reduce(
                        (daySum, a) =>
                            daySum + Number(a.collected ?? a.amount ?? 0),
                        0,
                    ),
                0,
            );
        });

        return totals;
    }, [appointmentsByMonth]);

    // =============================
    // LOAD MORE
    // =============================
    const IncreaseLimit = () => {
        setPage((prev) => prev + 1);
    };
    const paymentColor = {
        Cash: "payment-tag payment-cash",
        SBI: "payment-tag payment-SBI",
        Card: "payment-tag payment-card",
        ICICI: "payment-tag payment-bank",
        HDFC: "payment-tag payment-bank",
        Other: "payment-tag payment-other",
    };
    // =============================
    // RENDER
    // =============================
    return (
        <div className="records-container">
            {/* HEADER */}
            <div className="records-header">
                <h5 className="mb-0">Appointments</h5>

                <div className="records-actions">
                    <button
                        className="btn btn-outline-theme btn-sm d-flex align-items-center gap-2"
                        onClick={() => setFilterOpen((prev) => !prev)}
                    >
                        <SlidersHorizontal size={16} />
                        Filters
                        {activeFiltersCount > 0 && (
                            <span className="filter-badge">
                                {activeFiltersCount}
                            </span>
                        )}
                    </button>

                    {localStorage.getItem("role") === "doctor" && (
                        <button
                            className="btn btn-success btn-sm d-flex align-items-center gap-2 px-3"
                            onClick={downloadExcel}
                        >
                            <FileSpreadsheet size={16} />
                            <span>Export Excel</span>
                        </button>
                    )}
                </div>
            </div>

            {/* FILTER PANEL */}
            <FilterPanel
                open={filterOpen}
                setOpen={setFilterOpen}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedPayments={selectedPayments}
                setSelectedPayments={setSelectedPayments}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
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

            {/* LIST */}
            <AppointmentList
                appointmentsByMonth={appointmentsByMonth}
                navigate={navigate}
                monthTotal={monthTotal}
                appointments={appointments}
                total={total}
                IncreaseLimit={IncreaseLimit}
                loading={loading}
                paymentColor={paymentColor}
            />
        </div>
    );
}
