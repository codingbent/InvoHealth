import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
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

export default function PatientList(props) {
    const { currency, country, categoryColor, subCategoryColor } = props;
    const refreshTrigger = props.refreshTrigger ?? 0;
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("history");
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

    const [clinicTimezone, setClinicTimezone] = useState(null);
    // eslint-disable-next-line
    const [timezoneReady, setTimezoneReady] = useState(false);

    useEffect(() => {
        authFetch(`${API_BASE_URL}/api/doctor/get_doc`)
            .then((r) => r.json())
            .then((data) => {
                const tz = data?.doctor?.timezone || null;
                if (tz) setClinicTimezone(tz);
            })
            .catch((err) => {
                console.error("Failed to fetch clinic timezone:", err);
            })
            .finally(() => setTimezoneReady(true)); // always unblock
    }, []);

    const parseApptAsUTC = useCallback(
        (date, time = "00:00") => {
            if (!date) return new Date(0);
            if (clinicTimezone) {
                return fromZonedTime(`${date} ${time}`, clinicTimezone);
            }
            // Fallback: browser-local (timezone not loaded yet)
            const [y, m, d] = date.split("-").map(Number);
            const [hh, mm] = time.split(":").map(Number);
            return new Date(y, m - 1, d, hh, mm, 0, 0);
        },
        [clinicTimezone],
    );

    const [allFetched, setAllFetched] = useState(false);

    const activeFiltersCount =
        (searchTerm?.trim() ? 1 : 0) +
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
        // FIX: stop fetching once we have everything from the server
        if (allFetched && page > 0) return;

        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.set("limit", limit);
            params.set("skip", page * limit);
            if (debouncedSearch)
                params.set("search", debouncedSearch.toLowerCase());
            if (selectedGender) params.set("gender", selectedGender);
            if (selectedPayments.length)
                params.set("payments", selectedPayments.join(","));
            if (selectedStatus.length)
                params.set("status", selectedStatus.join(","));
            if (selectedServices.length)
                params.set("services", selectedServices.join(","));
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

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

            const serverTotal = data.total || 0;
            setTotal(serverTotal);

            // FIX: mark done when we've received all server-side records
            const fetchedSoFar = page * limit + flatData.length;
            if (fetchedSoFar >= serverTotal) {
                setAllFetched(true);
            }
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
        allFetched,
    ]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // FIX: reset allFetched whenever filters change so fresh data loads
    useEffect(() => {
        setPage(0);
        setAllFetched(false);
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

    useEffect(() => {
        if (refreshTrigger === 0) return;
        setPage(0);
        setAllFetched(false);
        setActiveTab("upcoming");
    }, [refreshTrigger]);

    // ── Split appointments into upcoming vs history ──────────────────
    const { upcomingAppointments, historyAppointments } = useMemo(() => {
        const upcoming = [];
        const history = [];
        const nowUTC = new Date();

        appointments.forEach((a) => {
            if (!a.date || !a.time) {
                history.push(a);
                return;
            }
            const apptUTC = parseApptAsUTC(a.date, a.time);
            if (apptUTC.getTime() >= nowUTC.getTime()) {
                upcoming.push(a);
            } else {
                history.push(a);
            }
        });

        upcoming.sort(
            (a, b) =>
                parseApptAsUTC(a.date, a.time) - parseApptAsUTC(b.date, b.time),
        );
        history.sort(
            (a, b) =>
                parseApptAsUTC(b.date, b.time) - parseApptAsUTC(a.date, a.time),
        );

        return { upcomingAppointments: upcoming, historyAppointments: history };
    }, [appointments, parseApptAsUTC]);

    const activeAppointments =
        activeTab === "upcoming" ? upcomingAppointments : historyAppointments;

    // ── Group whichever tab is active ────────────────────────────────
    const appointmentsByMonth = useMemo(() => {
        const grouped = {};

        activeAppointments.forEach((a) => {
            let monthKey;
            const dayKey = a.date;

            if (clinicTimezone) {
                const apptUTC = parseApptAsUTC(a.date, a.time || "00:00");
                const clinicLocalDate = toZonedTime(apptUTC, clinicTimezone);
                monthKey = clinicLocalDate.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                });
            } else {
                const [y, m, d] = a.date.split("-").map(Number);
                const fallback = new Date(y, m - 1, d);
                monthKey = fallback.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                });
            }

            if (!grouped[monthKey]) grouped[monthKey] = {};
            if (!grouped[monthKey][dayKey]) grouped[monthKey][dayKey] = [];
            grouped[monthKey][dayKey].push(a);
        });

        return grouped;
    }, [activeAppointments, parseApptAsUTC, clinicTimezone]);

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
        if (match) label = match.subCategoryName || match.categoryName;
        else if (a?.subCategoryName) label = a.subCategoryName;
        else if (a?.categoryName) label = a.categoryName;
        return label?.split(" ")[0];
    };

    const downloadExcel = async () => {
        try {
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/check_export_limit`,
            );
            const check = await checkRes.json();
            if (!checkRes.ok) {
                props.showAlert(
                    check.error || "Failed to export Excel",
                    checkRes.status === 403 ? "danger" : "danger",
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

    // FIX: IncreaseLimit only increments if we haven't fetched everything yet
    const IncreaseLimit = useCallback(() => {
        if (!allFetched && !loading) {
            setPage((prev) => prev + 1);
        }
    }, [allFetched, loading]);

    // FIX: effectiveTotal hides the sentinel on the upcoming tab once allFetched,
    // so the IntersectionObserver never fires again when upcoming is empty
    const effectiveTotal = useMemo(() => {
        if (activeTab === "upcoming") {
            return allFetched ? upcomingAppointments.length : total;
        }
        return total;
    }, [activeTab, allFetched, upcomingAppointments.length, total]);

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
                        {historyAppointments.length > 0 && (
                            <span className="pl-tab-count pl-tab-count-history">
                                {historyAppointments.length}
                            </span>
                        )}
                    </button>
                    <button
                        className={`pl-tab${activeTab === "upcoming" ? " pl-tab-active pl-tab-upcoming" : ""}`}
                        onClick={() => setActiveTab("upcoming")}
                    >
                        <CalendarClock size={13} />
                        Upcoming
                        {upcomingAppointments.length > 0 && (
                            <span className="pl-tab-count pl-tab-count-upcoming">
                                {upcomingAppointments.length}
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
                    total={effectiveTotal}
                    IncreaseLimit={IncreaseLimit}
                    loading={loading}
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
