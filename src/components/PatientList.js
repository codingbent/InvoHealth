import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toZonedTime } from "date-fns-tz";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { authFetch } from "./authfetch";
import FilterPanel from "./FilterPanel";
import AppointmentList from "./AppointmentList";
import {
    SlidersHorizontal,
    FileSpreadsheet,
    CalendarClock,
    History,
} from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchPaymentMethods } from "../api/payment.api";
import "../css/Patientlist.css";

const LIMIT = 20;

function buildFilterParams(filters) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search.toLowerCase());
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.payments.length)
        params.set("payments", filters.payments.join(","));
    if (filters.status.length) params.set("status", filters.status.join(","));
    if (filters.services.length)
        params.set("services", filters.services.join(","));
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    return params;
}

const INITIAL_TAB_STATE = {
    appointments: [],
    page: 0,
    total: 0,
    allFetched: false,
    loading: false,
};

export default function PatientList(props) {
    const { currency, country, categoryColor, subCategoryColor } = props;
    const refreshTrigger = props.refreshTrigger ?? 0;
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");

    const [historyState, setHistoryState] = useState(INITIAL_TAB_STATE);
    const [upcomingState, setUpcomingState] = useState(INITIAL_TAB_STATE);

    const [activeTab, setActiveTab] = useState("history");
    const [filterOpen, setFilterOpen] = useState(false);
    const [allServices, setAllServices] = useState([]);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [doctor, setDoctor] = useState(null);
    const [clinicTimezone, setClinicTimezone] = useState(null);

    useEffect(() => {
        setDoctor(localStorage.getItem("name"));
    }, []);

    useEffect(() => {
        authFetch(`${API_BASE_URL}/api/doctor/get_doc`)
            .then((r) => r.json())
            .then((data) => {
                const tz = data?.doctor?.timezone || null;
                if (tz) setClinicTimezone(tz);
            })
            .catch((err) =>
                console.error("Failed to fetch clinic timezone:", err),
            );
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

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 1000);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const activeFiltersCount =
        (searchTerm?.trim() ? 1 : 0) +
        selectedPayments.length +
        selectedStatus.length +
        selectedServices.length +
        (selectedGender ? 1 : 0) +
        (startDate || endDate ? 1 : 0) +
        (selectedFY ? 1 : 0);

    const fetchTab = useCallback(async (type, page, filters) => {
        const setState =
            type === "upcoming" ? setUpcomingState : setHistoryState;

        setState((prev) => ({ ...prev, loading: true }));

        try {
            const params = buildFilterParams(filters);
            params.set("type", type);
            params.set("limit", LIMIT);
            params.set("skip", page * LIMIT);

            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/fetchall_appointments?${params}`,
            );
            const data = await res.json();
            const flatData = Array.isArray(data?.data) ? data.data : [];
            const serverTotal = data.total || 0;

            setState((prev) => {
                const merged =
                    page === 0 ? flatData : [...prev.appointments, ...flatData];

                const fetchedSoFar = page * LIMIT + flatData.length;
                return {
                    appointments: merged,
                    page,
                    total: serverTotal,
                    allFetched: fetchedSoFar >= serverTotal,
                    loading: false,
                };
            });
        } catch (err) {
            console.error(`fetchTab(${type}) error:`, err);
            setState((prev) => ({ ...prev, loading: false }));
        }
    }, []);

    const filters = useMemo(
        () => ({
            search: debouncedSearch,
            gender: selectedGender,
            payments: selectedPayments,
            status: selectedStatus,
            services: selectedServices,
            startDate,
            endDate,
        }),
        [
            debouncedSearch,
            selectedGender,
            selectedPayments,
            selectedStatus,
            selectedServices,
            startDate,
            endDate,
        ],
    );

    useEffect(() => {
        setHistoryState(INITIAL_TAB_STATE);
        setUpcomingState(INITIAL_TAB_STATE);
    }, [filters, selectedFY]);

    useEffect(() => {
        if (historyState.loading) return;
        if (historyState.allFetched && historyState.page > 0) return;
        if (activeTab !== "history" && historyState.appointments.length > 0)
            return;

        fetchTab("history", historyState.page, filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyState.page, filters]);

    useEffect(() => {
        if (upcomingState.loading) return;
        if (upcomingState.allFetched && upcomingState.page > 0) return;
        if (activeTab !== "upcoming" && upcomingState.appointments.length > 0)
            return;

        fetchTab("upcoming", upcomingState.page, filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [upcomingState.page, filters]);

    useEffect(() => {
        if (refreshTrigger === 0) return;
        setHistoryState(INITIAL_TAB_STATE);
        setUpcomingState(INITIAL_TAB_STATE);
        setActiveTab("upcoming");
    }, [refreshTrigger]);

    const increaseHistoryLimit = useCallback(() => {
        setHistoryState((prev) => {
            if (prev.allFetched || prev.loading) return prev;
            return { ...prev, page: prev.page + 1 };
        });
    }, []);

    const increaseUpcomingLimit = useCallback(() => {
        setUpcomingState((prev) => {
            if (prev.allFetched || prev.loading) return prev;
            return { ...prev, page: prev.page + 1 };
        });
    }, []);

    const activeState = activeTab === "upcoming" ? upcomingState : historyState;
    const activeAppointments = activeState.appointments;
    const IncreaseLimit =
        activeTab === "upcoming" ? increaseUpcomingLimit : increaseHistoryLimit;

    const appointmentsByMonth = useMemo(() => {
        const grouped = {};

        activeAppointments.forEach((a) => {
            let monthKey;
            const dayKey = a.date;

            if (clinicTimezone) {
                const [y, m, d] = a.date.split("-").map(Number);
                const [hh, mm] = (a.time || "00:00").split(":").map(Number);
                const utc = new Date(Date.UTC(y, m - 1, d, hh, mm));
                const local = toZonedTime(utc, clinicTimezone);
                monthKey = local.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                });
            } else {
                const [y, m, d] = a.date.split("-").map(Number);
                monthKey = new Date(y, m - 1, d).toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                });
            }

            if (!grouped[monthKey]) grouped[monthKey] = {};
            if (!grouped[monthKey][dayKey]) grouped[monthKey][dayKey] = [];
            grouped[monthKey][dayKey].push(a);
        });

        return grouped;
    }, [activeAppointments, clinicTimezone]);

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

    const currencySymbol = props.currency?.symbol || "₹";

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

    const getPaymentLabel = useCallback(
        (a) => {
            const match = paymentOptions.find(
                (p) => String(p.id) === String(a.paymentMethodId),
            );
            let label = "Other";
            if (match) label = match.subCategoryName || match.categoryName;
            else if (a?.subCategoryName) label = a.subCategoryName;
            else if (a?.categoryName) label = a.categoryName;
            return label?.split(" ")[0];
        },
        [paymentOptions],
    );

    const applyFilters = useCallback(
        (data) =>
            data.filter((a) => {
                const searchMatch =
                    a.name
                        ?.toLowerCase()
                        .includes(debouncedSearch.toLowerCase()) ||
                    a.number?.includes(debouncedSearch);
                const paymentMatch =
                    selectedPayments.length === 0 ||
                    selectedPayments.includes(String(a.paymentMethodId));
                const statusMatch =
                    selectedStatus.length === 0 ||
                    selectedStatus.includes(a.status);
                const genderMatch =
                    !selectedGender || a.gender === selectedGender;
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
            }),
        [
            debouncedSearch,
            selectedPayments,
            selectedStatus,
            selectedGender,
            startDate,
            endDate,
            selectedServices,
        ],
    );

    const downloadExcel = async () => {
        try {
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/check_export_limit`,
            );
            const check = await checkRes.json();
            if (!checkRes.ok) {
                props.showAlert(
                    check.error || "Failed to export Excel",
                    "danger",
                );
                return;
            }
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

        const formatDiscount = (discount, isPercent) => {
            if (!discount) return "";
            return isPercent ? `${discount}%` : `${currencySymbol}${discount}`;
        };

        let totalRevenue = 0,
            totalCollected = 0,
            totalPending = 0,
            totalDiscount = 0;
        let paidCount = 0,
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

        const titleRow = sheet.addRow(["INVOHEALTH — MEDICAL CENTER RECORDS"]);
        titleRow.font = { bold: true, size: 13 };
        sheet.addRow([`Doctor:`, doctor || ""]).font = { bold: true };
        sheet.addRow(["Period:", `${fromDate} → ${toDate}`]);
        sheet.addRow(["Generated:", new Date().toLocaleDateString("en-IN")]);
        sheet.addRow([]);
        sheet.addRow(["FINANCIAL SUMMARY"]).font = { bold: true, size: 11 };
        addRowWithFormat(sheet, "Total Billed", totalRevenue, true, true);
        addRowWithFormat(sheet, "Total Collected", totalCollected, true, true);
        addRowWithFormat(sheet, "Total Pending", totalPending, true, true);
        addRowWithFormat(
            sheet,
            "Total Discounts Given",
            totalDiscount,
            true,
            true,
        );
        sheet.addRow([]);
        sheet.addRow(["VISIT SUMMARY"]).font = { bold: true, size: 11 };
        sheet.addRow(["Total Visits", sorted.length]);
        addRowWithFormat(sheet, "Paid", paidCount);
        addRowWithFormat(sheet, "Partial", partialCount);
        addRowWithFormat(sheet, "Unpaid", unpaidCount);
        sheet.addRow([]);
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
            const discountDisplay = formatDiscount(discount, a.isPercent);
            const status =
                remaining <= 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

            if (day !== currentDay) {
                if (currentDay !== null) {
                    const totalRow = sheet.addRow([
                        "",
                        "",
                        "",
                        "",
                        "DAY TOTAL →",
                        dayBilledTotal,
                        dayCollectedTotal,
                        dayBilledTotal - dayCollectedTotal,
                    ]);
                    totalRow.font = { bold: true };
                    [6, 7, 8].forEach((c) => {
                        totalRow.getCell(c).numFmt = `${currencySymbol}#,##0`;
                    });
                    sheet.addRow([]);
                }

                currentDay = day;
                dayCollectedTotal = 0;
                dayBilledTotal = 0;

                sheet.addRow([
                    new Date(day).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    }),
                ]).font = { bold: true, size: 11 };

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
                discountDisplay,
                status,
                a.invoiceNumber || "",
            ]);

            row.getCell(6).numFmt = `${currencySymbol}#,##0`;
            row.getCell(7).numFmt = `${currencySymbol}#,##0`;
            row.getCell(8).numFmt = `${currencySymbol}#,##0`;

            const statusColors = {
                Paid: "FF22C55E",
                Partial: "FFF59E0B",
                Unpaid: "FFEF4444",
            };
            row.getCell(10).font = {
                color: { argb: statusColors[status] || "FFCCCCCC" },
                bold: true,
            };

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
                [6, 7, 8].forEach((c) => {
                    lastTotalRow.getCell(c).numFmt = `${currencySymbol}#,##0`;
                });
            }
        });

        sheet.columns = [
            { width: 22 },
            { width: 8 },
            { width: 10 },
            { width: 35 },
            { width: 16 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
            { width: 12 },
            { width: 14 },
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(
            new Blob([buffer]),
            `invohealth-records-${toDate.replace(/\//g, "-")}.xlsx`,
        );
    };

    // ── Badge label helper ───────────────────────────────────────────
    // Shows loaded count (e.g. "20+") while more pages remain,
    // and the exact count (e.g. "38") once all records are fetched.
    const tabBadge = (state) => {
        const loaded = state.appointments.length;
        if (loaded === 0) return null;
        return state.allFetched ? `${loaded}` : `${loaded}+`;
    };

    return (
        <>
            <div className="pl-root">
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

                <div className="pl-tabs">
                    <button
                        className={`pl-tab${activeTab === "history" ? " pl-tab-active pl-tab-history" : ""}`}
                        onClick={() => setActiveTab("history")}
                    >
                        <History size={13} />
                        History
                        {tabBadge(historyState) && (
                            <span className="pl-tab-count pl-tab-count-history">
                                {tabBadge(historyState)}
                            </span>
                        )}
                    </button>
                    <button
                        className={`pl-tab${activeTab === "upcoming" ? " pl-tab-active pl-tab-upcoming" : ""}`}
                        onClick={() => setActiveTab("upcoming")}
                    >
                        <CalendarClock size={13} />
                        Upcoming
                        {tabBadge(upcomingState) && (
                            <span className="pl-tab-count pl-tab-count-upcoming">
                                {tabBadge(upcomingState)}
                            </span>
                        )}
                    </button>
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
                    currency={currency}
                    country={country}
                    clinicTimezone={clinicTimezone}
                />

                <AppointmentList
                    appointmentsByMonth={appointmentsByMonth}
                    navigate={navigate}
                    monthTotal={monthTotal}
                    appointments={activeAppointments}
                    total={activeState.total}
                    IncreaseLimit={IncreaseLimit}
                    loading={activeState.loading}
                    categoryColor={categoryColor}
                    subCategoryColor={subCategoryColor}
                    currency={currency}
                    paymentOptions={paymentOptions}
                    getPaymentLabel={getPaymentLabel}
                    activeTab={activeTab}
                />
            </div>
        </>
    );
}
