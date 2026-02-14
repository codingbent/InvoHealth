import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { authFetch } from "./authfetch";
import FilterPanel from "./FilterPanel";
import AppointmentList from "./AppointmentList";

export default function PatientList() {
    const navigate = useNavigate();

    // DATA
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true); // initial load

    // FILTER STATES
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
    const limit = 10;
    const [page, setPage] = useState(0);

    const [total, setTotal] = useState(0);

    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );

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

    const fetchServices = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/auth/fetchallservice`,
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
    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);

            const query = new URLSearchParams({
                limit,
                skip: page * limit,
                search: debouncedSearch,
                gender: selectedGender,
                payments: selectedPayments.join(","),
                status: selectedStatus.join(","),
                services: selectedServices.join(","),
                startDate,
                endDate,
            }).toString();

            const res = await authFetch(
                `${API_BASE_URL}/api/auth/fetchallappointments?${query}`,
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
        API_BASE_URL,
        page,
        limit,
        debouncedSearch,
        selectedGender,
        selectedPayments,
        selectedStatus,
        selectedServices,
        startDate,
        endDate,
    ]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // ------------------------------------------------------------
    // FETCH DOCTOR DETAILS
    // ------------------------------------------------------------
    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/auth/getdoc`);
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error("Error fetching doctor:", err);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchDoctor();
    }, [fetchDoctor]);

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
                `${API_BASE_URL}/api/auth/exportappointments`,
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
        ).toLocaleDateString();

        const toDate = new Date(sorted[0].date).toLocaleDateString();

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
        sheet.addRow([`Doctor: ${doctor?.name || ""}`]).font = { bold: true };
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

                sheet.addRow([new Date(day).toLocaleDateString()]).font = {
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
                new Date(a.date).toLocaleDateString(),
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

    const paymentColor = {
        Cash: "payment-tag payment-cash",
        UPI: "payment-tag payment-upi",
        Card: "payment-tag payment-card",
        ICICI: "payment-tag payment-bank",
        HDFC: "payment-tag payment-bank",
        Other: "payment-tag payment-other",
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
