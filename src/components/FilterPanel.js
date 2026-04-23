import { useEffect, useState } from "react";
import "../css/Filterpanel.css";
import { fetchPaymentMethods } from "../api/payment.api";

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
}) {
    const [paymentOptions, setPaymentOptions] = useState([]);

    const FY_CONFIG = {
        IN: { startMonth: 3, startDay: 1 },
        UK: { startMonth: 3, startDay: 6 },
        AU: { startMonth: 6, startDay: 1 },
        NZ: { startMonth: 6, startDay: 1 },

        DEFAULT: { startMonth: 0, startDay: 1 },
    };

    const getFYLabel = (fy) => {
        const config = FY_CONFIG[country?.code] || FY_CONFIG.DEFAULT;

        if (config.startMonth === 0) {
            return `FY ${fy}`;
        }

        return `FY ${fy}-${String(Number(fy) + 1).slice(-2)}`;
    };

    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const getTodayRange = () => {
        const today = new Date();
        return { start: formatDate(today), end: formatDate(today) };
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

    const getLast30DaysRange = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        return { start: formatDate(start), end: formatDate(end) };
    };

    const getThisMonthRange = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { start: formatDate(start), end: formatDate(end) };
    };

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchPaymentMethods();
                setPaymentOptions(data);
            } catch {
                alert("Failed to load payments", "danger");
            }
        };
        load();
    }, []);

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div className="fp-backdrop" onClick={() => setOpen(false)} />
            )}

            {/* Panel */}
            <div className={`fp-panel ${open ? "open" : ""}`}>
                {/* Header */}
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

                {/* Body */}
                <div className="fp-body">
                    {/* Search */}
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

                    {/* Payment Method */}
                    <div className="fp-section">
                        <fieldset className="fp-fieldset">
                            <legend className="fp-label">Payment Method</legend>

                            <div
                                className="fp-chips"
                                role="group"
                                aria-label="Payment Method"
                            >
                                {Array.isArray(paymentOptions) &&
                                    paymentOptions.map((p) => {
                                        const label = `${p.subCategoryName}`;
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
                                                {label}
                                            </button>
                                        );
                                    })}
                            </div>
                        </fieldset>
                    </div>

                    {/* Payment Status */}
                    {!isdashboard && (
                        <div className="fp-section">
                            <fieldset className="fp-fieldset">
                                <legend className="fp-label">
                                    Payment Status
                                </legend>

                                <div
                                    className="fp-chips"
                                    role="group"
                                    aria-label="Payment Status"
                                >
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
                                                    aria-label={type}
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

                    {/* Gender */}
                    <div className="fp-section">
                        <label htmlFor="gender" className="fp-label">
                            Gender
                        </label>
                        <select
                            id="gender"
                            name="gender"
                            autoComplete="sex"
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

                    {/* Services */}
                    <div className="fp-section">
                        <fieldset className="fp-fieldset">
                            <legend className="fp-label">Services</legend>

                            <div
                                className="fp-chips"
                                role="group"
                                aria-label="Services"
                            >
                                {allServices.map((s) => {
                                    const active = selectedServices.includes(s);

                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            role="checkbox"
                                            aria-checked={active}
                                            aria-label={`Service ${s}`}
                                            name="services"
                                            className={`fp-chip ${active ? "active" : ""}`}
                                            onClick={() =>
                                                setSelectedServices(
                                                    active
                                                        ? selectedServices.filter(
                                                              (x) => x !== s,
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

                    {/* Quick Filters */}
                    <div className="fp-section">
                        <fieldset className="fp-fieldset">
                            <legend className="fp-label">Quick Filters</legend>

                            <div
                                className="fp-chips"
                                role="group"
                                aria-label="Quick Filters"
                            >
                                <button
                                    type="button"
                                    name="quickFilter"
                                    aria-label="Filter Today"
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
                                    name="quickFilter"
                                    aria-label="Filter This Month"
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
                                    name="quickFilter"
                                    aria-label="Filter Last 30 Days"
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

                    {/* Date Range */}
                    <div className="fp-section">
                        <fieldset className="fp-fieldset">
                            <legend className="fp-label">Date Range</legend>

                            <div className="fp-date-row">
                                <input
                                    id="start-date"
                                    name="startDate"
                                    type="date"
                                    autoComplete="off"
                                    className="fp-input"
                                    value={startDate || ""}
                                    aria-label="Start Date"
                                    onChange={(e) => {
                                        setSelectedFY("");
                                        setStartDate(e.target.value);
                                    }}
                                />

                                <input
                                    id="end-date"
                                    name="endDate"
                                    type="date"
                                    autoComplete="off"
                                    className="fp-input"
                                    value={endDate || ""}
                                    aria-label="End Date"
                                    onChange={(e) => {
                                        setSelectedFY("");
                                        setEndDate(e.target.value);
                                    }}
                                />
                            </div>
                        </fieldset>
                    </div>

                    {/* Financial Year */}
                    <div className="fp-section">
                        <label htmlFor="financial-year" className="fp-label">
                            Financial Year
                        </label>

                        <select
                            id="financial-year"
                            name="financialYear"
                            autoComplete="off"
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

                {/* Footer — Reset */}
                <div className="fp-footer">
                    <button
                        className="fp-reset"
                        onClick={() => {
                            setSelectedPayments([]);
                            setSelectedServices([]);
                            setSelectedGender("");
                            setSelectedStatus([]);
                            setStartDate(null);
                            setEndDate(null);
                            setSelectedFY("");
                            setTimeout(() => {
                                setStartDate("");
                                setEndDate("");
                            }, 0);
                        }}
                    >
                        ↺ Reset all filters
                    </button>
                </div>
            </div>
        </>
    );
}
