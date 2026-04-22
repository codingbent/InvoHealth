import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { authFetch } from "./authfetch";
import FilterPanel from "./FilterPanel";
import AppointmentList from "./AppointmentList";
import { SlidersHorizontal, FileSpreadsheet } from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchPaymentMethods } from "../api/payment.api";
import "../css/Patientlist.css"

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
    const [paymentOptions, setPaymentOptions] = useState([]);
    const limit = 20;

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
        if (isCurrency) row.getCell(2).numFmt = `${currencySymbol}#,##0`;
        return row;
    };
    const currencySymbol = props.currency?.symbol || "₹";
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

    useEffect(() => {
        setDoctor(localStorage.getItem("name"));
    }, []);

    useEffect(() => {
        const loadPaymentMethods = async () => {
            try {
                const methods = await fetchPaymentMethods();
                setPaymentOptions(methods);
            } catch (err) {
                console.error("Payment fetch error:", err);
            }
        };

        loadPaymentMethods();
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 1000);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        if (!paymentOptions.length) return;

        setAppointments((prev) => [...prev]);
    }, [paymentOptions]);

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
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            params.set("limit", limit);
            params.set("skip", page * limit);

            if (debouncedSearch) {
                params.set("search", debouncedSearch.toLowerCase());
            }
            if (selectedGender) {
                params.set("gender", selectedGender);
            }
            if (selectedPayments.length) {
                params.set("payments", selectedPayments.join(","));
            }
            if (selectedStatus.length) {
                params.set("status", selectedStatus.join(","));
            }
            if (selectedServices.length) {
                params.set("services", selectedServices.join(","));
            }
            if (startDate) {
                params.set("startDate", startDate);
            }
            if (endDate) {
                params.set("endDate", endDate);
            }

            const query = params.toString();
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/fetchall_appointments?${query}`,
            );
            const data = await res.json();

            const flatData = Array.isArray(data?.data) ? data.data : [];

            const sortAppointments = (arr = []) =>
                Array.isArray(arr)
                    ? [...arr].sort(
                          (a, b) =>
                              new Date(`${b.date}T${b.time || "00:00"}`) -
                              new Date(`${a.date}T${a.time || "00:00"}`),
                      )
                    : [];

            setAppointments((prev = []) => {
                const merged =
                    page === 0
                        ? flatData
                        : [...(Array.isArray(prev) ? prev : []), ...flatData];

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
                selectedPayments.includes(String(a.paymentMethodId));
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

    const getPaymentLabel = (a) => {
        const match = paymentOptions.find(
            (p) => String(p.id) === String(a.paymentMethodId),
        );

        let label = "Other";

        if (match) {
            label = match.subCategoryName || match.categoryName;
        } else if (a?.subCategoryName) {
            label = a.subCategoryName;
        } else if (a?.categoryName) {
            label = a.categoryName;
        }

        // MATCH TABLE UI
        return label?.split(" ")[0];
    };

    const downloadExcel = async () => {
        try {
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/check_export_limit`,
            );

            const check = await checkRes.json();

            // Handle HTTP errors FIRST
            if (!checkRes.ok) {
                if (checkRes.status === 403) {
                    props.showAlert(
                        check.error || "Excel export limit reached",
                        "danger",
                    );
                } else {
                    props.showAlert(
                        check.error || "Failed to export Excel",
                        "danger",
                    );
                }
                return;
            }

            // Handle logical API failure
            if (!check.success) {
                props.showAlert(check.error, "danger");
                return;
            }

            // Last export warning
            if (check.remaining === 1) {
                const confirmExport = window.confirm(
                    "⚠ This is your LAST Excel export for this plan.\n\nDo you want to continue?",
                );
                if (!confirmExport) return;
            }

            // Export API
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/export_appointments`,
            );

            const result = await res.json();

            if (!res.ok) {
                props.showAlert(
                    result.error || "Failed to export Excel",
                    "danger",
                );
                return;
            }

            const filteredForExport = applyFilters(result.data);

            if (!filteredForExport.length) {
                props.showAlert("No data to export", "warning");
                return;
            }

            exportToExcel(filteredForExport);
        } catch (err) {
            console.error(err);
            props.showAlert("Something went wrong", "danger");
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
            totalDiscount = 0,
            paidCount = 0,
            partialCount = 0,
            unpaidCount = 0;
        const paymentSummary = {};

        sorted.forEach((a) => {
            const billed = Number(a.amount ?? 0);
            const collected = Number(a.collected ?? 0);
            const remaining = Number(a.remaining ?? billed - collected);
            const discount = Number(a.discount ?? 0);
            totalRevenue += billed;
            totalCollected += collected;
            totalPending += remaining > 0 ? remaining : 0;
            totalDiscount += discount;
            if (remaining <= 0) paidCount++;
            else if (collected > 0) partialCount++;
            else unpaidCount++;
            const key = getPaymentLabel(a) || "Unknown";
            paymentSummary[key] = (paymentSummary[key] || 0) + collected;
        });

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "InvoHealth";
        workbook.created = new Date();
        const sheet = workbook.addWorksheet("Visit Records");

        // ── Header info ──
        const titleRow = sheet.addRow(["INVOHEALTH — MEDICAL CENTER RECORDS"]);
        titleRow.font = { bold: true, size: 13 };
        sheet.addRow([`Doctor:`, doctor || ""]).font = { bold: true };
        sheet.addRow(["Period:", `${fromDate} → ${toDate}`]);
        sheet.addRow(["Generated:", new Date().toLocaleDateString("en-IN")]);
        sheet.addRow([]);

        // ── Financial summary ──
        sheet.addRow(["FINANCIAL SUMMARY"]).font = { bold: true, size: 11 };
        addRowWithFormat(sheet, "Total Billed", totalRevenue, true, true);
        addRowWithFormat(
            sheet,
            "Total Collected",
            totalCollected - totalDiscount,
            true,
            true,
        );
        addRowWithFormat(sheet, "Total Pending", totalPending, true, true);
        addRowWithFormat(
            sheet,
            "Total Discounts Given",
            totalDiscount,
            true,
            true,
        );
        sheet.addRow([]);

        // ── Visit counts ──
        sheet.addRow(["VISIT SUMMARY"]).font = { bold: true, size: 11 };
        sheet.addRow(["Total Visits", sorted.length]);
        addRowWithFormat(sheet, "Paid", paidCount);
        addRowWithFormat(sheet, "Partial", partialCount);
        addRowWithFormat(sheet, "Unpaid", unpaidCount);
        sheet.addRow([]);

        // ── Payment mode breakdown ──
        sheet.addRow(["COLLECTION BY PAYMENT MODE"]).font = {
            bold: true,
            size: 11,
        };
        Object.entries(paymentSummary)
            .sort((a, b) => b[1] - a[1])
            .forEach(([type, amount]) => {
                const pct =
                    totalCollected > 0
                        ? ((amount / totalCollected) * 100).toFixed(1)
                        : "0.0";
                const row = sheet.addRow([type, amount, `${pct}%`]);
                row.getCell(2).numFmt = `${currencySymbol}#,##0`;
            });
        sheet.addRow([]);

        // ── Day-wise records ──
        sheet.addRow(["DETAILED RECORDS"]).font = { bold: true, size: 11 };
        sheet.addRow([]);

        let currentDay = null,
            dayCollectedTotal = 0,
            dayBilledTotal = 0;

        sorted.forEach((a, index) => {
            const day = new Date(a.date).toISOString().split("T")[0];
            const billed = Number(a.amount ?? 0);
            const collected = Number(a.collected ?? billed);
            const remaining = billed - collected;
            const discount = Number(a.discount ?? 0);
            const status =
                remaining <= 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

            if (day !== currentDay) {
                // Close previous day
                if (currentDay !== null) {
                    const totalRow = sheet.addRow([
                        "",
                        "",
                        "",
                        "",
                        // "",
                        "DAY TOTAL →",
                        dayBilledTotal,
                        dayCollectedTotal,
                        dayBilledTotal - dayCollectedTotal,
                    ]);
                    totalRow.font = { bold: true };
                    totalRow.getCell(7).numFmt = `${currencySymbol}#,##0`;
                    totalRow.getCell(8).numFmt = `${currencySymbol}#,##0`;
                    totalRow.getCell(9).numFmt = `${currencySymbol}#,##0`;
                    sheet.addRow([]);
                }

                currentDay = day;
                dayCollectedTotal = 0;
                dayBilledTotal = 0;

                // Day header
                sheet.addRow([
                    new Date(day).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    }),
                ]).font = { bold: true, size: 11 };

                // Column headers
                const headerRow = sheet.addRow([
                    "Patient",
                    "Age",
                    "Gender",
                    "Services",
                    "Payment Mode",
                    "Billed",
                    "Collected",
                    "Pending",
                    "Discount",
                    "Status",
                    "Invoice No",
                ]);
                headerRow.font = { bold: true };
                headerRow.eachCell((cell) => {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "FF1E293B" },
                    };
                    cell.font = { bold: true, color: { argb: "FFE2E8F0" } };
                });
            }

            dayCollectedTotal += collected;
            dayBilledTotal += billed;

            const row = sheet.addRow([
                a.name,
                a.age || "",
                a.gender || "",
                (a.services || [])
                    .map((s) => (typeof s === "object" ? s.name : s))
                    .join(", "),
                getPaymentLabel(a),
                billed,
                collected,
                remaining > 0 ? remaining : 0,
                discount > 0 ? discount : "",
                status,
                a.invoiceNumber || "",
            ]);

            row.getCell(7).numFmt = `${currencySymbol}#,##0`;
            row.getCell(8).numFmt = `${currencySymbol}#,##0`;
            row.getCell(9).numFmt = `${currencySymbol}#,##0`;
            if (discount > 0) row.getCell(10).numFmt = `${currencySymbol}#,##0`;

            // Color status cell
            const statusColors = {
                Paid: "FF22C55E",
                Partial: "FFF59E0B",
                Unpaid: "FFEF4444",
            };
            row.getCell(11).font = {
                color: { argb: statusColors[status] || "FFCCCCCC" },
                bold: true,
            };

            // Last entry — close last day
            if (index === sorted.length - 1) {
                const lastTotalRow = sheet.addRow([
                    "",
                    "",
                    "",
                    "",
                    "DAY TOTAL →",
                    dayBilledTotal,
                    dayCollectedTotal,
                    dayBilledTotal - dayCollectedTotal,
                ]);
                lastTotalRow.font = { bold: true };
                lastTotalRow.getCell(7).numFmt = `${currencySymbol}#,##0`;
                lastTotalRow.getCell(8).numFmt = `${currencySymbol}#,##0`;
                lastTotalRow.getCell(9).numFmt = `${currencySymbol}#,##0`;
            }
        });

        // ── Column widths ──
        sheet.columns = [
            { width: 22 }, // Patient
            { width: 8 }, // Age
            { width: 10 }, // Gender
            { width: 35 }, // Services
            { width: 16 }, // Payment Mode
            { width: 14 }, // Billed
            { width: 14 }, // Collected
            { width: 14 }, // Pending
            { width: 14 }, // Discount
            { width: 12 }, // Status
            { width: 14 }, // Invoice No
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer]),
            `invohealth-records-${toDate.replace(/\//g, "-")}.xlsx`,
        );
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

    const categoryColor = {
        Cash: "pl-tag pl-cash",
        Bank: "pl-tag pl-bank",
        Card: "pl-tag pl-card",
        UPI: "pl-tag pl-upi",
        Wallet: "pl-tag pl-wallet",
        Online: "pl-tag pl-online",
        Default: "pl-tag pl-other",
    };

    const subCategoryColor = {
        SBI: "pl-tag pl-sbi",
        ICICI: "pl-tag pl-icici",
        HDFC: "pl-tag pl-hdfc",
        GPay: "pl-tag pl-gpay",
        PhonePe: "pl-tag pl-phonepe",
        Paytm: "pl-tag pl-paytm",
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
                    paymentOptions={paymentOptions}
                    currency={props.currency}
                />

                <AppointmentList
                    appointmentsByMonth={appointmentsByMonth}
                    navigate={navigate}
                    monthTotal={monthTotal}
                    appointments={appointments}
                    total={total}
                    IncreaseLimit={IncreaseLimit}
                    loading={loading}
                    categoryColor={categoryColor}
                    subCategoryColor={subCategoryColor}
                    currency={props.currency}
                    paymentOptions={paymentOptions}
                    getPaymentLabel={getPaymentLabel}
                />
            </div>
        </>
    );
}
