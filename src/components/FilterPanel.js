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
}) {
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
        const start = new Date(Number(fy), 3, 1);
        const end = new Date(Number(fy) + 1, 2, 31);
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
                            <label className="fp-label">Search Patient</label>
                            <input
                                className="fp-input"
                                placeholder="Enter Name"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}

                    {/* Payment Method */}
                    <div className="fp-section">
                        <label className="fp-label">Payment Method</label>
                        <div className="fp-chips">
                            {[
                                "Cash",
                                "Card",
                                "SBI",
                                "ICICI",
                                "HDFC",
                                "Other",
                            ].map((type) => {
                                const isActive =
                                    selectedPayments.includes(type);
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        className={`fp-chip ${isActive ? "active" : ""}`}
                                        onClick={() =>
                                            setSelectedPayments(
                                                isActive
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
                                );
                            })}
                        </div>
                    </div>

                    {/* Payment Status */}
                    {!isdashboard && (
                        <div className="fp-section">
                            <label className="fp-label">Payment Status</label>
                            <div className="fp-chips">
                                {["Unpaid", "Paid", "Partial"].map((type) => {
                                    const isActive =
                                        selectedStatus.includes(type);
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`fp-chip ${isActive ? "active" : ""}`}
                                            onClick={() =>
                                                setSelectedStatus(
                                                    isActive
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
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Gender */}
                    <div className="fp-section">
                        <label className="fp-label">Gender</label>
                        <select
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
                        <label className="fp-label">Services</label>
                        <div className="fp-chips">
                            {allServices.map((s) => {
                                const active = selectedServices.includes(s);
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        className={`fp-chip ${active ? "active" : ""}`}
                                        onClick={() =>
                                            setSelectedServices(
                                                active
                                                    ? selectedServices.filter(
                                                          (x) => x !== s,
                                                      )
                                                    : [...selectedServices, s],
                                            )
                                        }
                                    >
                                        {s}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="fp-divider" />

                    {/* Quick Filters */}
                    <div className="fp-section">
                        <label className="fp-label">Quick Filters</label>
                        <div className="fp-chips">
                            <button
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
                                className="fp-chip quick"
                                onClick={() => {
                                    const { start, end } = getThisMonthRange();
                                    setStartDate(start);
                                    setEndDate(end);
                                    setSelectedFY("");
                                }}
                            >
                                This Month
                            </button>
                            <button
                                className="fp-chip quick"
                                onClick={() => {
                                    const { start, end } = getLast30DaysRange();
                                    setStartDate(start);
                                    setEndDate(end);
                                    setSelectedFY("");
                                }}
                            >
                                Last 30 Days
                            </button>
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="fp-section">
                        <label className="fp-label">Date Range</label>
                        <div className="fp-date-row">
                            <input
                                type="date"
                                className="fp-input"
                                value={startDate || ""}
                                onChange={(e) => {
                                    setSelectedFY("");
                                    setStartDate(e.target.value);
                                }}
                            />
                            <input
                                type="date"
                                className="fp-input"
                                value={endDate || ""}
                                onChange={(e) => {
                                    setSelectedFY("");
                                    setEndDate(e.target.value);
                                }}
                            />
                        </div>
                    </div>

                    {/* Financial Year */}
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
                            <option value="">All Years</option>
                            <option value="2025">FY 2025-26</option>
                            <option value="2026">FY 2026-27</option>
                            <option value="2027">FY 2027-28</option>
                            <option value="2028">FY 2028-29</option>
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
                                setStartDate(undefined);
                                setEndDate(undefined);
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
