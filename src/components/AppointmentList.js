import { useEffect, useRef } from "react";
import AppointmentDay from "./AppointmentDay";
import "../css/Appointmentlist.css";
import { LockIcon } from "lucide-react";

const FAKE_PATIENTS = [
    {
        name: "Riya Sharma",
        age: 34,
        service: "General Consultation",
        amount: "₹500",
        status: "Paid",
        payment: "Cash",
        time: "09:00 AM",
    },
    {
        name: "Arjun Mehta",
        age: 28,
        service: "Follow-up",
        amount: "₹300",
        status: "Partial",
        payment: "UPI",
        time: "09:30 AM",
    },
    {
        name: "Priya Nair",
        age: 45,
        service: "Cardiology",
        amount: "₹1,200",
        status: "Paid",
        payment: "Card",
        time: "10:00 AM",
    },
    {
        name: "Karan Singh",
        age: 52,
        service: "Orthopaedics",
        amount: "₹800",
        status: "Unpaid",
        payment: "Cash",
        time: "10:30 AM",
    },
    {
        name: "Meena Iyer",
        age: 61,
        service: "Diabetes Check",
        amount: "₹650",
        status: "Paid",
        payment: "UPI",
        time: "11:00 AM",
    },
    {
        name: "Rohit Verma",
        age: 39,
        service: "Dermatology",
        amount: "₹900",
        status: "Paid",
        payment: "Card",
        time: "11:30 AM",
    },
    {
        name: "Sunita Rao",
        age: 29,
        service: "General Consultation",
        amount: "₹500",
        status: "Partial",
        payment: "Cash",
        time: "12:00 PM",
    },
    {
        name: "Amit Joshi",
        age: 47,
        service: "ENT",
        amount: "₹750",
        status: "Paid",
        payment: "UPI",
        time: "02:00 PM",
    },
];

const STATUS_COLORS = {
    Paid: "#22c55e",
    Partial: "#f59e0b",
    Unpaid: "#ef4444",
};

export default function AppointmentList({
    appointmentsByMonth,
    monthTotal,
    categoryColor,
    subCategoryColor,
    navigate,
    appointments,
    total,
    IncreaseLimit,
    loading,
    currency,
    getPaymentLabel,
    paymentOptions,
    activeTab,
    planExpired,
    onUpgradeClick,
}) {
    const loadMoreRef = useRef(null);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        isFetchingRef.current = false;
    }, [activeTab]);

    useEffect(() => {
        if (appointments.length >= total) return;
        if (planExpired) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const firstEntry = entries[0];
                if (
                    firstEntry.isIntersecting &&
                    !loading &&
                    !isFetchingRef.current
                ) {
                    isFetchingRef.current = true;
                    IncreaseLimit();
                    setTimeout(() => {
                        isFetchingRef.current = false;
                    }, 800);
                }
            },
            { threshold: 0.2, rootMargin: "300px" },
        );

        const current = loadMoreRef.current;
        if (current) observer.observe(current);
        return () => observer.disconnect();
    }, [appointments.length, total, loading, IncreaseLimit, planExpired]);

    const role = localStorage.getItem("role");
    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);

    const monthKeys = Object.keys(appointmentsByMonth);

    // ── Initial skeleton ─────────────────────────────────────────────
    if (loading && appointments.length === 0) {
        return (
            <div>
                {[1, 2, 3].map((i) => (
                    <div key={i} style={{ marginBottom: 24 }}>
                        <div
                            className="pl-skeleton"
                            style={{
                                height: 36,
                                borderRadius: 8,
                                marginBottom: 10,
                            }}
                        />
                        <div className="pl-table-card">
                            {[1, 2, 3, 4].map((j) => (
                                <div className="pl-skeleton-row" key={j}>
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "22%", height: 12 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "10%", height: 12 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "12%", height: 18 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{
                                            width: "10%",
                                            height: 12,
                                            marginLeft: "auto",
                                        }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "12%", height: 18 }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // ── Render month blocks ──────────────────────────────────────────
    const renderMonths = (keys) =>
        keys.map((month) => (
            <div key={month} className="al-month-block">
                <div className="al-month-header">
                    <div className="al-month-left">
                        <span className="al-month-name">{month}</span>
                        <div className="al-month-line" />
                    </div>
                    {role === "doctor" && (
                        <div className="al-month-total">
                            {currency?.symbol} {fmt(monthTotal[month])}
                        </div>
                    )}
                </div>

                {Object.keys(appointmentsByMonth[month]).map((day) => (
                    <AppointmentDay
                        key={day}
                        day={day}
                        dayApps={appointmentsByMonth[month][day]}
                        categoryColor={categoryColor}
                        navigate={navigate}
                        loading={loading}
                        currency={currency}
                        subCategoryColor={subCategoryColor}
                        paymentOptions={paymentOptions}
                        getPaymentLabel={getPaymentLabel}
                        isUpcoming={activeTab === "upcoming"}
                    />
                ))}
            </div>
        ));

    return (
        <>
            {!loading && appointments.length === 0 && !planExpired && (
                <div className="al-empty">
                    <div className="al-empty-icon">
                        {activeTab === "upcoming" ? "◷" : "◎"}
                    </div>
                    {activeTab === "upcoming"
                        ? "No upcoming appointments scheduled"
                        : "No records match the selected filters"}
                </div>
            )}

            {planExpired ? (
                <div className="al-expired-container">
                    {/* Blurred fake data background */}
                    <div className="al-expired-fake-data" aria-hidden="true">
                        {/* Month header */}
                        <div className="al-expired-month-header">
                            <span className="al-expired-month-label">
                                May 2025
                            </span>
                            <div className="al-expired-month-line" />
                            <span className="al-expired-month-amount">
                                ₹8,650
                            </span>
                        </div>

                        {/* Fake day label */}
                        <div className="al-expired-day-label">
                            Thursday, 29 May 2025
                        </div>

                        {/* Fake appointment rows */}
                        {FAKE_PATIENTS.map((p, i) => (
                            <div className="al-expired-row" key={i}>
                                <div className="al-expired-avatar">
                                    {p.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .slice(0, 2)}
                                </div>
                                <div className="al-expired-info">
                                    <span className="al-expired-name">
                                        {p.name}
                                    </span>
                                    <span className="al-expired-meta">
                                        {p.age} yrs · {p.service}
                                    </span>
                                </div>
                                <div className="al-expired-right">
                                    <span className="al-expired-time">
                                        {p.time}
                                    </span>
                                    <span
                                        className="al-expired-status"
                                        style={{
                                            color: STATUS_COLORS[p.status],
                                        }}
                                    >
                                        {p.status}
                                    </span>
                                    <span className="al-expired-amount">
                                        {p.amount}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Overlay + lock box */}
                    <div className="al-expired-overlay">
                        <div className="al-expired-box">
                            <div className="al-expired-lock-wrap">
                                <div className="al-expired-lock-icon">
                                    <LockIcon size={22} />
                                </div>
                            </div>
                            <p className="al-expired-title">
                                Subscription Expired
                            </p>
                            <p className="al-expired-sub">
                                Your plan has expired. Renew to regain full
                                access to appointment history.
                            </p>
                            <button
                                className="al-expired-btn"
                                onClick={onUpgradeClick}
                            >
                                Upgrade Plan
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {renderMonths(monthKeys)}
                    <div ref={loadMoreRef} style={{ height: 1 }} />
                    {loading && appointments.length > 0 && (
                        <div className="pl-table-card" style={{ marginTop: 8 }}>
                            {[1, 2, 3].map((j) => (
                                <div className="pl-skeleton-row" key={j}>
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "22%", height: 12 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "10%", height: 12 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "12%", height: 18 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{
                                            width: "10%",
                                            height: 12,
                                            marginLeft: "auto",
                                        }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "12%", height: 18 }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </>
    );
}
