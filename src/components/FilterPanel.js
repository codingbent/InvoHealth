import { useState } from "react";

export default function FilterPanel({
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
}) {
    const [open, setOpen] = useState(false);
    const formatDate = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
    };

    const getTodayRange = () => {
        const today = new Date();
        return {
            start: formatDate(today),
            end: formatDate(today),
        };
    };
    const applyFinancialYear = (fy) => {
        if (!fy) return;

        const start = new Date(Number(fy), 3, 1); // 1 April
        const end = new Date(Number(fy) + 1, 2, 31); // 31 March

        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    const getLast30DaysRange = () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);

        return {
            start: formatDate(start),
            end: formatDate(end),
        };
    };

    const getThisMonthRange = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return {
            start: formatDate(start),
            end: formatDate(end),
        };
    };
    return (
        <>
            {/* OPEN BUTTON */}
            <div className="w-75 mx-auto mb-3">
                <button
                    className="btn btn-outline-primary w-100"
                    onClick={() => setOpen(true)}
                >
                    🔍 Filters
                </button>
            </div>

            {/* OFFCANVAS */}
            <div
                className={`offcanvas offcanvas-end shadow-lg theme-offcanvas ${
                    open ? "show" : ""
                }`}
            >
                {/* HEADER */}
                <div className="offcanvas-header border-bottom theme-border">
                    <h5 className="fw-semibold mb-0">🔍 Filters</h5>
                    <button
                        className="btn-close"
                        onClick={() => setOpen(false)}
                    />
                </div>

                {/* BODY */}
                <div className="offcanvas-body">
                    <div className="offcanvas-body">
                        {/* SEARCH */}
                        {!isdashboard && (
                            <div className="mb-4">
                                <label className="form-label small fw-semibold text-theme-muted">
                                    Search Patient
                                </label>
                                <input
                                    className="form-control rounded-3 theme-input"
                                    placeholder="Name or phone number"
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                />
                            </div>
                        )}

                        {/* PAYMENT TYPES */}
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-theme-muted">
                                Payment Method
                            </label>

                            <div className="d-flex flex-wrap gap-2">
                                {[
                                    "Cash",
                                    "Card",
                                    "UPI",
                                    "ICICI",
                                    "HDFC",
                                    "Other",
                                ].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`btn btn-sm rounded-pill ${
                                            selectedPayments.includes(type)
                                                ? "btn-primary"
                                                : "btn-outline-secondary"
                                        }`}
                                        onClick={() =>
                                            setSelectedPayments(
                                                selectedPayments.includes(type)
                                                    ? selectedPayments.filter(
                                                          (p) => p !== type,
                                                      )
                                                    : [
                                                          ...selectedPayments,
                                                          type,
                                                      ],
                                            )
                                        }
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/*Payment Status*/}
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-theme-muted">
                                Payment Status
                            </label>

                            <div className="d-flex flex-wrap gap-2">
                                {[
                                    "Unpaid",
                                    "Paid",
                                    "Partial",
                                ].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`btn btn-sm rounded-pill ${
                                            selectedStatus.includes(type)
                                                ? "btn-primary"
                                                : "btn-outline-secondary"
                                        }`}
                                        onClick={() =>
                                            setSelectedStatus(
                                                selectedStatus.includes(type)
                                                    ? selectedStatus.filter(
                                                          (p) => p !== type,
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
                                ))}
                            </div>
                        </div>

                        {/* GENDER */}
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-theme-muted">
                                Gender
                            </label>
                            <select
                                className="form-select rounded-3 theme-input"
                                value={selectedGender}
                                onChange={(e) =>
                                    setSelectedGender(e.target.value)
                                }
                            >
                                <option value="">All</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </div>

                        <hr />

                        {/* SERVICES */}
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-theme-muted">
                                Services
                            </label>

                            <div className="d-flex flex-wrap gap-2 border rounded-3 p-2 theme-border theme-surface">
                                {allServices.map((s) => {
                                    const active = selectedServices.includes(s);

                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            className={`btn btn-sm rounded-pill ${
                                                active
                                                    ? "btn-primary"
                                                    : "btn-outline-secondary"
                                            }`}
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
                        </div>

                        <hr />
                        {/* QUICK FILTERS */}
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-theme-muted">
                                Quick Filters
                            </label>

                            <div className="d-flex flex-wrap gap-2">
                                <button
                                    className="btn btn-sm btn-outline-primary rounded-pill"
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
                                    className="btn btn-sm btn-outline-primary rounded-pill"
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
                                    className="btn btn-sm btn-outline-primary rounded-pill"
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
                        </div>

                        {/* DATE RANGE */}
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-theme-muted">
                                Date Range
                            </label>

                            <div className="row g-2">
                                <div className="col-6">
                                    <input
                                        type="date"
                                        className="form-control rounded-3"
                                        value={startDate}
                                        onChange={(e) => {
                                            setSelectedFY("");
                                            setStartDate(e.target.value);
                                        }}
                                    />
                                </div>

                                <div className="col-6">
                                    <input
                                        type="date"
                                        className="form-control rounded-3"
                                        value={endDate}
                                        onChange={(e) => {
                                            setSelectedFY("");
                                            setEndDate(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FINANCIAL YEAR */}
                        <div className="mb-4">
                            <label className="form-label small fw-semibold text-theme-muted">
                                Financial Year
                            </label>
                            <select
                                className="form-select rounded-3 theme-input"
                                value={selectedFY}
                                onChange={(e) => {
                                    const fy = e.target.value;
                                    setSelectedFY(fy);
                                    applyFinancialYear(fy); // ✅ APPLY FY LOGIC
                                }}
                            >
                                <option value="">All Years</option>
                                <option value="2025">FY 2025-26</option>
                                <option value="2026">FY 2026-27</option>
                                <option value="2027">FY 2027-28</option>
                                <option value="2028">FY 2028-29</option>
                            </select>
                        </div>

                        {/* RESET */}
                        <div className="d-grid gap-2 mt-4">
                            <button
                                className="btn btn-outline-theme rounded-3"
                                onClick={() => {
                                    setSearchTerm("");
                                    setSelectedPayments([]);
                                    setSelectedServices([]);
                                    setSelectedGender("");
                                    setStartDate("");
                                    setEndDate("");
                                    setSelectedFY("");
                                }}
                            >
                                ♻ Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* BACKDROP */}
            {open && (
                <div
                    className="offcanvas-backdrop fade show"
                    onClick={() => setOpen(false)}
                />
            )}
        </>
    );
}
