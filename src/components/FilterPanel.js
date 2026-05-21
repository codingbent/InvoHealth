import { useEffect, useState, useRef } from "react";
import { toZonedTime } from "date-fns-tz";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "../css/Filterpanel.css";
import { fetchPaymentMethods } from "../api/payment.api";
import { CalendarDays, X } from "lucide-react";

export default function FilterPanel({
    open,
    setOpen,
    searchTerm,
    setSearchTerm,
    selectedPayments,
    setSelectedPayments,
    selectedStatus,
    setSelectedStatus,
    selectedGender,
    setSelectedGender,
    allServices,
    selectedServices,
    setSelectedServices,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedFY,
    setSelectedFY,
    isdashboard = false,
    country,
    clinicTimezone = null,
}) {
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const calendarRef = useRef(null);

    // ── Close calendar on outside click ──────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (calendarRef.current && !calendarRef.current.contains(e.target))
                setCalendarOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Date helpers ─────────────────────────────────────────────────
    const parseDate = (str) => {
        if (!str) return undefined;
        const [y, m, d] = str.split("-").map(Number);
        return new Date(y, m - 1, d);
    };

    const toDateStr = (date) => {
        if (!date) return "";
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const displayDate = (str) => {
        if (!str) return null;
        const [y, m, d] = str.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const range = {
        from: parseDate(startDate),
        to: parseDate(endDate),
    };

    const handleRangeSelect = (selectedRange) => {
        setSelectedFY("");
        if (!selectedRange) {
            setStartDate("");
            setEndDate("");
            return;
        }
        const { from, to } = selectedRange;
        setStartDate(from ? toDateStr(from) : "");
        setEndDate(to ? toDateStr(to) : "");
        // Close once a full range is chosen
        if (from && to) setCalendarOpen(false);
    };

    const clearDates = (e) => {
        e.stopPropagation();
        setStartDate("");
        setEndDate("");
        setSelectedFY("");
        setCalendarOpen(false);
    };

    // ── FY helpers ───────────────────────────────────────────────────
    const FY_CONFIG = {
        IN: { startMonth: 3, startDay: 1 },
        UK: { startMonth: 3, startDay: 6 },
        AU: { startMonth: 6, startDay: 1 },
        NZ: { startMonth: 6, startDay: 1 },
        DEFAULT: { startMonth: 0, startDay: 1 },
    };

    const getFYLabel = (fy) => {
        const config = FY_CONFIG[country?.code] || FY_CONFIG.DEFAULT;
        if (config.startMonth === 0) return `FY ${fy}`;
        return `FY ${fy}-${String(Number(fy) + 1).slice(-2)}`;
    };

    const getClinicToday = () =>
        clinicTimezone ? toZonedTime(new Date(), clinicTimezone) : new Date();

    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const getTodayRange = () => {
        const today = getClinicToday();
        const s = formatDate(today);
        return { start: s, end: s };
    };

    const getLast30DaysRange = () => {
        const end = getClinicToday();
        const start = toZonedTime(
            new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
            clinicTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        );
        return { start: formatDate(start), end: formatDate(end) };
    };

    const getThisMonthRange = () => {
        const now = getClinicToday();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: formatDate(start), end: formatDate(end) };
    };

    const applyFinancialYear = (fy) => {
        if (!fy) return;
        const config = FY_CONFIG[country?.code] || FY_CONFIG.DEFAULT;
        const start = new Date(Number(fy), config.startMonth, config.startDay);
        const end = new Date(start);
        end.setFullYear(start.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    useEffect(() => {
        fetchPaymentMethods()
            .then(setPaymentOptions)
            .catch(() => alert("Failed to load payments", "danger"));
    }, []);

    return (
        <>
            {open && (
                <div className="fp-backdrop" onClick={() => setOpen(false)} />
            )}

            <div className={`fp-panel ${open ? "open" : ""}`}>
                <div className="fp-header">
                    <div className="fp-header-left">
                        <div className="fp-title">
                            Filter <em>Results</em>
                        </div>
                    </div>
                    <button className="fp-close" onClick={() => setOpen(false)}>
                        ✕
                    </button>
                </div>

                <div className="fp-body">
                    {!isdashboard && (
                        <div className="fp-section">
                            <label htmlFor="search" className="fp-label">
                                Search Patient
                            </label>
                            <input
                                id="search"
                                name="search"
                                autoComplete="name"
                                className="fp-input"
                                placeholder="Enter Name"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}

                    <div className="fp-section">
                        <fieldset className="fp-fieldset">
                            <legend className="fp-label">Payment Method</legend>
                            <div className="fp-chips" role="group">
                                {Array.isArray(paymentOptions) &&
                                    paymentOptions.map((p) => {
                                        const isActive =
                                            selectedPayments.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={isActive}
                                                className={`fp-chip ${isActive ? "active" : ""}`}
                                                onClick={() =>
                                                    setSelectedPayments(
                                                        isActive
                                                            ? selectedPayments.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      p.id,
                                                              )
                                                            : [
                                                                  ...selectedPayments,
                                                                  p.id,
                                                              ],
                                                    )
                                                }
                                            >
                                                {p.subCategoryName}
                                            </button>
                                        );
                                    })}
                            </div>
                        </fieldset>
                    </div>

                    {!isdashboard && (
                        <div className="fp-section">
                            <fieldset className="fp-fieldset">
                                <legend className="fp-label">
                                    Payment Status
                                </legend>
                                <div className="fp-chips" role="group">
                                    {["Paid", "Partial", "Unpaid"].map(
                                        (type) => {
                                            const isActive =
                                                selectedStatus.includes(type);
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    role="checkbox"
                                                    aria-checked={isActive}
                                                    className={`fp-chip ${isActive ? "active" : ""}`}
                                                    onClick={() =>
                                                        setSelectedStatus(
                                                            isActive
                                                                ? selectedStatus.filter(
                                                                      (p) =>
                                                                          p !==
                                                                          type,
                                                                  )
                                                                : [
                                                                      ...selectedStatus,
                                                                      type,
                                                                  ],
                                                        )
                                                    }
                                                >
                                                    {type}
                                                </button>
                                            );
                                        },
                                    )}
                                </div>
                            </fieldset>
                        </div>
                    )}

                    <div className="fp-section">
                        <label htmlFor="gender" className="fp-label">
                            Gender
                        </label>
                        <select
                            id="gender"
                            className="fp-select"
                            value={selectedGender}
                            onChange={(e) => setSelectedGender(e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div className="fp-divider" />

                    {!isdashboard && (
                        <div className="fp-section">
                            <fieldset className="fp-fieldset">
                                <legend className="fp-label">Services</legend>
                                <div className="fp-chips" role="group">
                                    {allServices.map((s) => {
                                        const active =
                                            selectedServices.includes(s);
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                role="checkbox"
                                                aria-checked={active}
                                                className={`fp-chip ${active ? "active" : ""}`}
                                                onClick={() =>
                                                    setSelectedServices(
                                                        active
                                                            ? selectedServices.filter(
                                                                  (x) =>
                                                                      x !== s,
                                                              )
                                                            : [
                                                                  ...selectedServices,
                                                                  s,
                                                              ],
                                                    )
                                                }
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </fieldset>
                        </div>
                    )}

                    {/* Quick Filters */}
                    <div className="fp-section">
                        <fieldset className="fp-fieldset">
                            <legend className="fp-label">Quick Filters</legend>
                            <div className="fp-chips" role="group">
                                <button
                                    type="button"
                                    className="fp-chip quick"
                                    onClick={() => {
                                        const { start, end } = getTodayRange();
                                        setStartDate(start);
                                        setEndDate(end);
                                        setSelectedFY("");
                                    }}
                                >
                                    Today
                                </button>
                                <button
                                    type="button"
                                    className="fp-chip quick"
                                    onClick={() => {
                                        const { start, end } =
                                            getThisMonthRange();
                                        setStartDate(start);
                                        setEndDate(end);
                                        setSelectedFY("");
                                    }}
                                >
                                    This Month
                                </button>
                                <button
                                    type="button"
                                    className="fp-chip quick"
                                    onClick={() => {
                                        const { start, end } =
                                            getLast30DaysRange();
                                        setStartDate(start);
                                        setEndDate(end);
                                        setSelectedFY("");
                                    }}
                                >
                                    Last 30 Days
                                </button>
                            </div>
                        </fieldset>
                    </div>

                    {/* ── Date Range with DayPicker ─────────────────── */}
                    <div className="fp-section">
                        <fieldset className="fp-fieldset">
                            <legend className="fp-label">Date Range</legend>

                            {/* Trigger pill */}
                            <div
                                className={`fp-date-trigger ${calendarOpen ? "open" : ""} ${startDate ? "has-value" : ""}`}
                                onClick={() => setCalendarOpen((p) => !p)}
                            >
                                <CalendarDays
                                    size={14}
                                    className="fp-date-icon"
                                />
                                <span className="fp-date-from">
                                    {startDate
                                        ? displayDate(startDate)
                                        : "Start date"}
                                </span>
                                <span className="fp-date-arrow">→</span>
                                <span className="fp-date-to">
                                    {endDate
                                        ? displayDate(endDate)
                                        : "End date"}
                                </span>
                                {(startDate || endDate) && (
                                    <button
                                        className="fp-date-clear"
                                        onClick={clearDates}
                                        aria-label="Clear dates"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            {/* Validation message */}
                            {startDate && !endDate && (
                                <p className="fp-date-hint">
                                    Pick an end date to complete the range
                                </p>
                            )}

                            {/* Calendar popup */}
                            {calendarOpen && (
                                <div
                                    className="fp-calendar-popover"
                                    ref={calendarRef}
                                >
                                    <DayPicker
                                        mode="range"
                                        selected={range}
                                        onSelect={handleRangeSelect}
                                        numberOfMonths={1}
                                        showOutsideDays
                                    />
                                </div>
                            )}
                        </fieldset>
                    </div>

                    <div className="fp-section">
                        <label className="fp-label">Financial Year</label>
                        <select
                            className="fp-select"
                            value={selectedFY}
                            onChange={(e) => {
                                const fy = e.target.value;
                                setSelectedFY(fy);
                                applyFinancialYear(fy);
                            }}
                        >
                            <option value="">Select Financial Year</option>
                            {Array.from({ length: 6 }).map((_, i) => {
                                const year = 2025 + i;
                                return (
                                    <option key={year} value={year}>
                                        {getFYLabel(year)}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>

                <div className="fp-footer">
                    <button
                        className="fp-reset"
                        onClick={() => {
                            if (setSearchTerm) setSearchTerm("");
                            setSelectedPayments([]);
                            setSelectedServices([]);
                            setSelectedGender("");
                            setSelectedStatus([]);
                            setStartDate("");
                            setEndDate("");
                            setSelectedFY("");
                            setCalendarOpen(false);
                        }}
                    >
                        ↺ Reset all filters
                    </button>
                </div>
            </div>
        </>
    );
}
