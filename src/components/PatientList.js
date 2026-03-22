// ─── PatientList.jsx ────────────────────────────────────────────────────────
import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { authFetch } from "./authfetch";
import FilterPanel from "./FilterPanel";
import AppointmentList from "./AppointmentList";
import { SlidersHorizontal, FileSpreadsheet } from "lucide-react";

export default function PatientList(props) {
    const navigate = useNavigate();
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
    const limit = 20;

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const activeFiltersCount =
        selectedPayments.length +
        selectedStatus.length +
        selectedServices.length +
        (selectedGender ? 1 : 0) +
        (startDate || endDate ? 1 : 0) +
        (selectedFY ? 1 : 0);

    const addRowWithFormat = (
        sheet,
        label,
        value,
        isCurrency = false,
        bold = false,
    ) => {
        const row = sheet.addRow([label, value]);
        if (bold) row.font = { bold: true };
        if (isCurrency) row.getCell(2).numFmt = "₹#,##0";
        return row;
    };

    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    useEffect(() => {
        setDoctor(localStorage.getItem("name"));
    }, []);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 1000);
        return () => clearTimeout(t);
    }, [searchTerm]);

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
            const sortAppointments = (arr) =>
                [...arr].sort(
                    (a, b) =>
                        new Date(`${b.date}T${b.time || "00:00"}`) -
                        new Date(`${a.date}T${a.time || "00:00"}`),
                );
            const flatData = data.data;
            setAppointments((prev) => {
                const merged = page === 0 ? flatData : [...prev, ...flatData];
                return sortAppointments(merged);
            });
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
        Object.keys(grouped).forEach((month) =>
            Object.keys(grouped[month]).forEach((day) => {
                grouped[month][day].sort(
                    (a, b) => new Date(b.date) - new Date(a.date),
                );
            }),
        );
        return grouped;
    }, [appointments]);

    const applyFilters = (data) =>
        data.filter((a) => {
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

    const downloadExcel = async () => {
        try {
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/check_export_limit`,
            );
            const check = await checkRes.json();
            if (!check.success) {
                props.showAlert(check.error, "danger");
                return;
            }
            if (check.remaining === 1) {
                const confirmExport = window.confirm(
                    "⚠ This is your LAST Excel export for this plan.\n\nDo you want to continue?",
                );
                if (!confirmExport) return;
            }
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/export_appointments`,
            );
            const result = await res.json();
            const filteredForExport = applyFilters(result.data);
            if (!filteredForExport.length) {
                props.showAlert("No data to export", "warning");
                return;
            }
            exportToExcel(filteredForExport);
        } catch (err) {
            console.error(err);
            props.showAlert("Failed to export Excel", "danger");
        }
    };

    const exportToExcel = async (data) => {
        if (!data.length) return;
        const sorted = [...data].sort(
            (a, b) => new Date(b.date) - new Date(a.date),
        );
        const fromDate = new Date(
            sorted[sorted.length - 1].date,
        ).toLocaleDateString("en-IN");
        const toDate = new Date(sorted[0].date).toLocaleDateString("en-IN");
        let totalRevenue = 0,
            totalCollected = 0,
            totalPending = 0,
            paidCount = 0,
            partialCount = 0,
            unpaidCount = 0;
        const paymentSummary = {};
        sorted.forEach((a) => {
            const billed = Number(a.amount ?? 0),
                collected = Number(a.collected ?? 0),
                remaining = Number(a.remaining ?? billed - collected);
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
        sheet.addRow([`Doctor:`, `${doctor || ""}`]).font = { bold: true };
        sheet.addRow(["From", fromDate]);
        sheet.addRow(["To", toDate]);
        sheet.addRow([]);
        addRowWithFormat(sheet, "TOTAL REVENUE", totalRevenue, true, true);
        addRowWithFormat(sheet, "TOTAL COLLECTED", totalCollected, true, true);
        addRowWithFormat(sheet, "TOTAL PENDING", totalPending, true, true);
        sheet.addRow([]);
        addRowWithFormat(sheet, "Paid Visits", paidCount);
        addRowWithFormat(sheet, "Partial Visits", partialCount);
        addRowWithFormat(sheet, "Unpaid Visits", unpaidCount);
        sheet.addRow([]);
        sheet.addRow(["COLLECTION SUMMARY"]).font = { bold: true };
        Object.entries(paymentSummary).forEach(([type, amount]) => {
            const row = sheet.addRow([type, amount]);
            row.getCell(2).numFmt = "₹#,##0";
        });
        sheet.addRow([]);
        let currentDay = null,
            dayCollectedTotal = 0;
        sorted.forEach((a, index) => {
            const day = new Date(a.date).toISOString().split("T")[0];
            const billed = Number(a.amount ?? 0),
                collected = Number(a.collected ?? billed),
                remaining = billed - collected;
            const status =
                remaining <= 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";
            if (day !== currentDay) {
                if (currentDay !== null) {
                    const totalRow = sheet.addRow([
                        "",
                        "",
                        "",
                        "",
                        "DAY TOTAL (Collected)",
                        dayCollectedTotal,
                    ]);
                    totalRow.font = { bold: true };
                    totalRow.getCell(6).numFmt = "₹#,##0";
                    sheet.addRow([]);
                }
                currentDay = day;
                dayCollectedTotal = 0;
                sheet.addRow([new Date(day).toLocaleDateString("en-IN")]).font =
                    { bold: true };
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
            const row = sheet.addRow([
                a.name,
                a.number || "",
                new Date(a.date).toLocaleDateString("en-IN"),
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
            row.getCell(5).numFmt = "₹#,##0";
            row.getCell(6).numFmt = "₹#,##0";
            row.getCell(7).numFmt = "₹#,##0";
            if (index === sorted.length - 1) {
                const lastTotalRow = sheet.addRow([
                    "",
                    "",
                    "",
                    "",
                    "DAY TOTAL (Collected)",
                    dayCollectedTotal,
                ]);
                lastTotalRow.font = { bold: true };
                lastTotalRow.getCell(6).numFmt = "₹#,##0";
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

    const IncreaseLimit = () => setPage((prev) => prev + 1);

    const paymentColor = {
        Cash: "pl-tag pl-cash",
        SBI: "pl-tag pl-sbi",
        Card: "pl-tag pl-card",
        ICICI: "pl-tag pl-bank",
        HDFC: "pl-tag pl-bank",
        Other: "pl-tag pl-other",
    };

    return (
        <>
            <div className="pl-root">
                {/* Header */}
                <div className="pl-header">
                    <div className="pl-header-left">
                        <h1 className="pl-title">Appointments</h1>
                    </div>
                    <div className="pl-header-actions">
                        <button
                            className="pl-btn pl-btn-outline"
                            onClick={() => setFilterOpen((p) => !p)}
                        >
                            <SlidersHorizontal size={14} />
                            Filters
                            {activeFiltersCount > 0 && (
                                <span className="pl-filter-badge">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                        {localStorage.getItem("role") === "doctor" && (
                            <button
                                className="pl-btn pl-btn-excel"
                                onClick={downloadExcel}
                            >
                                <FileSpreadsheet size={14} />
                                Export Excel
                            </button>
                        )}
                    </div>
                </div>

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
        </>
    );
}
