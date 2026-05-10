import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
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
    // eslint-disable-next-line
    const [doctor, setDoctor] = useState(null);
    const [page, setPage] = useState(0);
    const [filterOpen, setFilterOpen] = useState(false);
    const [total, setTotal] = useState(0);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const limit = 20;

    // ── Clinic timezone — fetched from DB via get_doc ────────────────
    // get_doc already populates address.countryId with the timezone field.
    // We just needed to add it to the response (see get_doc.js fix).
    // e.g. "America/New_York", "Asia/Kolkata", "Europe/London"
    const [clinicTimezone, setClinicTimezone] = useState(null);

    useEffect(() => {
        const fetchTimezone = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/get_doc`,
                );
                const data = await res.json();
                const tz = data?.doctor?.timezone || null;
                if (tz) setClinicTimezone(tz);
            } catch (err) {
                console.error("Failed to fetch clinic timezone:", err);
                // clinicTimezone stays null → falls back to browser-local parsing
            }
        };
        fetchTimezone();
    }, []);

    /**
     * parseApptAsUTC
     * ──────────────
     * Interprets the stored "YYYY-MM-DD" + "HH:MM" as a moment IN the
     * clinic's timezone and returns the equivalent UTC Date.
     *
     * Example (US clinic, New_York = UTC-4 in summer):
     *   parseApptAsUTC("2026-05-08", "20:30")
     *   → fromZonedTime("2026-05-08 20:30", "America/New_York")
     *   → 2026-05-09T00:30:00Z
     *
     *   new Date() when US time is 20:25 → 2026-05-09T00:25:00Z
     *   00:30Z > 00:25Z  →  UPCOMING ✓
     *
     * Device timezone has absolutely zero effect on either value.
     */
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

    const activeFiltersCount =
        (searchTerm?.trim() ? 1 : 0) +
        selectedPayments.length +
        selectedStatus.length +
        selectedServices.length +
        (selectedGender ? 1 : 0) +
        (startDate || endDate ? 1 : 0) +
        (selectedFY ? 1 : 0);

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

            setAppointments((prev = []) => {
                const merged =
                    page === 0
                        ? flatData
                        : [...(Array.isArray(prev) ? prev : []), ...flatData];
                return merged;
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

    useEffect(() => {
        if (refreshTrigger === 0) return;
        setPage(0);
        setActiveTab("upcoming");
    }, [refreshTrigger]);

    // ── Split into upcoming / history ────────────────────────────────
    const { upcomingAppointments, historyAppointments } = useMemo(() => {
        const upcoming = [];
        const history = [];
        const nowUTC = new Date(); // always UTC, no device-timezone effect

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

    // ── Group by month (clinic timezone labels) ───────────────────────
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

    const emailExcel = async () => {
        try {
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/check_export_limit`,
            );
            const check = await checkRes.json();
            if (!checkRes.ok || !check.success) {
                props.showAlert(
                    check.error || "Failed to send Excel",
                    "danger",
                );
                return;
            }
            if (check.remaining === 1) {
                const confirmExport = window.confirm(
                    "⚠ This is your LAST Excel export for this plan.\n\nDo you want to continue?",
                );
                if (!confirmExport) return;
            }
            props.showAlert("Sending Excel to your email...", "warning");
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/email_export`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        filters: {
                            search: debouncedSearch,
                            gender: selectedGender,
                            payments: selectedPayments,
                            status: selectedStatus,
                            services: selectedServices,
                            startDate,
                            endDate,
                        },
                    }),
                },
            );
            const result = await res.json();
            if (!res.ok) {
                props.showAlert(
                    result.error || "Failed to send Excel",
                    "danger",
                );
                return;
            }
            props.showAlert(
                "Excel report sent successfully to your email",
                "success",
            );
        } catch (err) {
            console.error(err);
            if (err.message === "Excel export limit reached") {
                props.showAlert(
                    "Excel export limit reached for your current plan",
                    "danger",
                );
                return;
            }
            props.showAlert(err.message || "Something went wrong", "danger");
        }
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
                                onClick={emailExcel}
                            >
                                <FileSpreadsheet size={14} />
                                Mail Excel
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
                    total={total}
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
