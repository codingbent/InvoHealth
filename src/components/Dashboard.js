import React from "react";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import FilterPanel from "./FilterPanel";
import { fetchPaymentMethods } from "../api/payment.api";
import { authFetch } from "./authfetch";
import {
    SlidersHorizontal,
    LockIcon,
    TrendingUp,
    Users,
    Clock,
    IndianRupee,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    CalendarDays,
    PieChart,
    BarChart3,
    Filter,
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardSkeleton from "./DashboardSkeleton";
import { API_BASE_URL } from "../components/config";
import "../css/Dashboard.css";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Filler,
);

const DONUT_COLORS = [
    "#3b82f6",
    "#22c55e",
    "#f59e0b",
    "#06b6d4",
    "#8b5cf6",
    "#f43f5e",
    "#10b981",
    "#f97316",
];

// ─────────────────────────────────────────────────────────────────────────────
// Animated counter hook
// Restarts cleanly whenever `target` changes (e.g. filters applied).
// ─────────────────────────────────────────────────────────────────────────────
function useCountUp(target, duration = 900, enabled = true) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        // Reset to 0 immediately so the counter always starts from 0
        setValue(0);
        if (!enabled || !target) return;

        const startTime = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4); // ease-out-quart
            setValue(Math.round(target * eased));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration, enabled]);

    return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────
function KPI({
    label,
    value,
    accent,
    isCurrency = true,
    icon: Icon,
    trend,
    currencySymbol,
    animated,
}) {
    const displayed = useCountUp(Number(value || 0), 900, animated);
    const fmt = (v) => new Intl.NumberFormat("en-IN").format(Number(v || 0));

    const trendPositive = trend > 0;
    const trendNeutral = trend === 0 || trend === undefined;

    return (
        <div className="db-kpi" style={{ "--accent": accent }}>
            <div className="db-kpi-top">
                <span className="db-kpi-label">{label}</span>
                <span className="db-kpi-icon">
                    <Icon size={15} />
                </span>
            </div>
            <div className="db-kpi-value">
                {isCurrency && (
                    <span className="db-kpi-sym">{currencySymbol}</span>
                )}
                {fmt(displayed)}
            </div>
            {!trendNeutral && (
                <div
                    className={`db-kpi-trend ${trendPositive ? "up" : "down"}`}
                >
                    {trendPositive ? (
                        <ArrowUpRight size={11} />
                    ) : (
                        <ArrowDownRight size={11} />
                    )}
                    <span>{Math.abs(trend)}% vs last period</span>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty chart placeholder
// ─────────────────────────────────────────────────────────────────────────────
function EmptyChart({ icon: Icon, label }) {
    return (
        <div className="db-empty-chart">
            <Icon size={28} strokeWidth={1.2} />
            <span>{label}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardContent — defined OUTSIDE Dashboard to prevent remount on each
// parent render. Receives all derived data as props so React.memo works.
// ─────────────────────────────────────────────────────────────────────────────
const DashboardContent = React.memo(function DashboardContent({
    analytics,
    currency,
    animated,
    paymentOptions,
    paymentChartData,
    serviceChartData,
    trendChartData,
    donutOpts,
    barOpts,
    lineOpts,
    serviceFilterActive,
}) {
    const fmt = useCallback(
        (v) => new Intl.NumberFormat("en-IN").format(Number(v || 0)),
        [],
    );

    const hasPaymentData = (analytics?.paymentSummary?.length || 0) > 0;
    const hasServiceData = (analytics?.serviceSummary?.length || 0) > 0;
    const hasTrendData = (analytics?.monthlyTrend?.length || 0) > 0;
    const sym = currency?.symbol || "₹";

    return (
        <div className="db-content">
            {/* ── KPI row ─────────────────────────────────────────────────── */}
            <div className="db-kpi-row">
                {/*
                  Gross Revenue: raw pre-discount total (sum of visits.amount).
                  Does NOT deduct discounts — that is shown separately as
                  "Net Revenue" and "Total Discount".
                */}
                <KPI
                    icon={IndianRupee}
                    label="Gross Revenue"
                    value={analytics?.totalRevenue}
                    accent="#3b82f6"
                    currencySymbol={sym}
                    animated={animated}
                />
                {/*
                  Collected: how much has actually been paid (capped at finalAmount).
                  totalCollection comes directly from the backend — no client-side math.
                */}
                <KPI
                    icon={Activity}
                    label="Net Revenue"
                    value={
                        analytics
                            ? Math.max(
                                  (analytics.totalRevenue || 0) -
                                      (analytics.totalDiscount || 0),
                                  0,
                              )
                            : 0
                    }
                    accent="#6366f1"
                    currencySymbol={sym}
                    animated={animated}
                />
                <KPI
                    icon={TrendingUp}
                    label="Collected"
                    value={analytics?.totalCollection}
                    accent="#22c55e"
                    currencySymbol={sym}
                    animated={animated}
                />
                <KPI
                    icon={Clock}
                    label="Pending"
                    value={analytics?.totalPending}
                    accent="#f59e0b"
                    currencySymbol={sym}
                    animated={animated}
                />
                <KPI
                    icon={Users}
                    label="Total Visits"
                    value={analytics?.totalVisits}
                    accent="#8b5cf6"
                    isCurrency={false}
                    animated={animated}
                />
                <KPI
                    icon={Wallet}
                    label="Total Discount"
                    value={analytics?.totalDiscount}
                    accent="#06b6d4"
                    currencySymbol={sym}
                    animated={animated}
                />
            </div>

            {/* ── Charts row 1: Donut + Bar ────────────────────────────────── */}
            <div className="db-row">
                {/* Payment Distribution */}
                <div className="db-card db-card-split">
                    <div className="db-card-head">
                        <PieChart size={14} />
                        <span>Payment Distribution</span>
                    </div>
                    <div className="db-card-body db-split-body">
                        <div className="db-donut-wrap">
                            {hasPaymentData ? (
                                <Doughnut
                                    data={paymentChartData}
                                    options={donutOpts}
                                />
                            ) : (
                                <EmptyChart
                                    icon={PieChart}
                                    label="No payment data"
                                />
                            )}
                        </div>
                        <ul className="db-legend">
                            {hasPaymentData ? (
                                analytics.paymentSummary.map((p, i) => {
                                    // percentage is relative to totalCollection, not totalRevenue
                                    const pct =
                                        analytics.totalCollection > 0
                                            ? (
                                                  (p.total /
                                                      analytics.totalCollection) *
                                                  100
                                              ).toFixed(1)
                                            : "0.0";
                                    const match = paymentOptions.find(
                                        (opt) =>
                                            String(opt.id) === String(p.type),
                                    );
                                    const label = match
                                        ? (
                                              match.subCategoryName ||
                                              match.categoryName
                                          ).split(" ")[0]
                                        : "Other";
                                    return (
                                        <li
                                            key={String(p.type)}
                                            className="db-legend-item"
                                        >
                                            <span
                                                className="db-legend-dot"
                                                style={{
                                                    background:
                                                        DONUT_COLORS[
                                                            i %
                                                                DONUT_COLORS.length
                                                        ],
                                                }}
                                            />
                                            <span className="db-legend-name">
                                                {label}
                                            </span>
                                            <span className="db-legend-val">
                                                {sym}
                                                {fmt(p.total)}
                                                <span className="db-legend-pct">
                                                    {pct}%
                                                </span>
                                            </span>
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="db-legend-empty">
                                    Add appointments to see payment breakdown
                                </li>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Revenue by Service */}
                <div className="db-card">
                    <div className="db-card-head">
                        <BarChart3 size={14} />
                        <span>
                            {serviceFilterActive
                                ? "Revenue by Selected Service(s)"
                                : "Revenue by Service"}
                        </span>
                        {serviceFilterActive && (
                            <span className="db-card-badge">
                                <Filter size={10} /> Filtered
                            </span>
                        )}
                    </div>
                    <div className="db-card-body" style={{ height: 240 }}>
                        {hasServiceData ? (
                            <Bar data={serviceChartData} options={barOpts} />
                        ) : (
                            <EmptyChart
                                icon={BarChart3}
                                label="No service data for this filter"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* ── Charts row 2: Line trend + Collection summary ─────────────── */}
            <div className="db-row">
                {/* Monthly Revenue Trend */}
                <div className="db-card db-card-wide">
                    <div className="db-card-head">
                        <Activity size={14} />
                        <span>Monthly Revenue Trend</span>
                        <span className="db-card-badge">Last 12 months</span>
                    </div>
                    <div className="db-card-body" style={{ height: 200 }}>
                        {hasTrendData ? (
                            <Line data={trendChartData} options={lineOpts} />
                        ) : (
                            <EmptyChart
                                icon={Activity}
                                label="No trend data for this period"
                            />
                        )}
                    </div>
                </div>

                {/* Collection summary */}
                <div className="db-card db-summary-card">
                    <div className="db-card-head">
                        <CalendarDays size={14} />
                        <span>Collection Summary</span>
                    </div>
                    <div className="db-card-body db-summary-body">
                        <div className="db-summary-row">
                            <div className="db-summary-label">
                                <span
                                    className="db-summary-dot"
                                    style={{ background: "#22c55e" }}
                                />
                                Collected
                            </div>
                            <div
                                className="db-summary-val"
                                style={{ color: "#22c55e" }}
                            >
                                {sym}
                                {fmt(analytics?.totalCollection)}
                            </div>
                        </div>
                        <div className="db-summary-row">
                            <div className="db-summary-label">
                                <span
                                    className="db-summary-dot"
                                    style={{ background: "#f59e0b" }}
                                />
                                Pending
                            </div>
                            <div
                                className="db-summary-val"
                                style={{ color: "#f59e0b" }}
                            >
                                {sym}
                                {fmt(analytics?.totalPending)}
                            </div>
                        </div>

                        {/* Collection rate bar */}
                        <div className="db-collect-bar-wrap">
                            <div className="db-collect-bar-label">
                                <span>Collection Rate</span>
                                <span className="db-collect-pct">
                                    {analytics?.totalRevenue > 0
                                        ? (
                                              (analytics.totalCollection /
                                                  (analytics.totalCollection +
                                                      analytics.totalPending)) *
                                              100
                                          ).toFixed(1)
                                        : 0}
                                    %
                                </span>
                            </div>
                            <div className="db-collect-track">
                                <div
                                    className="db-collect-fill"
                                    style={{
                                        width:
                                            analytics?.totalRevenue > 0
                                                ? `${Math.min(
                                                      (analytics.totalCollection /
                                                          (analytics.totalCollection +
                                                              analytics.totalPending)) *
                                                          100,
                                                      100,
                                                  )}%`
                                                : "0%",
                                    }}
                                />
                            </div>
                        </div>

                        <div
                            className="db-summary-row"
                            style={{ marginTop: "auto" }}
                        >
                            <div className="db-summary-label">
                                <span
                                    className="db-summary-dot"
                                    style={{ background: "#3b82f6" }}
                                />
                                Net Revenue
                            </div>
                            <div
                                className="db-summary-val"
                                style={{ color: "#3b82f6" }}
                            >
                                {sym}
                                {fmt(
                                    analytics?.totalCollection +
                                        analytics?.totalPending,
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard component
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard({
    currency,
    subscription,
    showAlert,
    country,
}) {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dateError, setDateError] = useState("");
    const [allServices, setAllServices] = useState([]);
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedStatus, setSelectedStatus] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [plan, setPlan] = useState(null);
    const [animated, setAnimated] = useState(false);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [clinicTimezone, setClinicTimezone] = useState(null);

    const activeFiltersCount =
        selectedPayments.length +
        selectedStatus.length +
        selectedServices.length +
        (selectedGender ? 1 : 0) +
        (startDate || endDate ? 1 : 0) +
        (selectedFY ? 1 : 0);

    const fmt = useCallback(
        (v) => new Intl.NumberFormat("en-IN").format(Number(v || 0)),
        [],
    );

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
            }
        };
        fetchTimezone();
    }, []);

    // ── Resolve plan ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (subscription) {
            const s = subscription.status;
            const p = subscription.plan?.toUpperCase() || "FREE";
            setPlan(s === "expired" ? "EXPIRED" : p);
            return;
        }
        const fetchSub = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/subscription`,
                );
                const data = await res.json();
                if (data.success && data.subscription) {
                    setPlan(
                        data.subscription.status === "expired"
                            ? "EXPIRED"
                            : data.subscription.plan?.toUpperCase() || "FREE",
                    );
                } else {
                    setPlan("FREE");
                }
            } catch {
                setPlan("FREE");
            }
        };
        fetchSub();
    }, [subscription]);

    // ── Load payment methods ──────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchPaymentMethods();
                setPaymentOptions(data);
            } catch {
                showAlert("Failed to load payment methods", "danger");
            }
        };
        load();
    }, [showAlert]);

    // ── Load services for filter panel ────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/services/fetchall_services`,
                );
                const data = await res.json();
                if (data.success && Array.isArray(data.services)) {
                    setAllServices(data.services.map((s) => s.name).sort());
                }
            } catch (e) {
                console.error("[Dashboard] failed to load services:", e);
            }
        };
        load();
    }, []);

    // ── Date range validation ─────────────────────────────────────────────────
    const dateRangeValid = useMemo(() => {
        if (!startDate || !endDate) return true; // partial range → valid
        return new Date(endDate) >= new Date(startDate);
    }, [startDate, endDate]);

    useEffect(() => {
        if (startDate && endDate && !dateRangeValid) {
            setDateError("End date cannot be before start date.");
            setAnalytics(null); // clear stale data immediately
        } else {
            setDateError("");
        }
    }, [startDate, endDate, dateRangeValid]);

    // ── Fetch analytics ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!plan || !["PRO", "ENTERPRISE"].includes(plan)) return;
        if (!dateRangeValid) return;

        let cancelled = false;

        const fetch$ = async () => {
            setLoading(true);
            setAnimated(false);
            try {
                const params = new URLSearchParams();
                if (selectedPayments.length)
                    params.set("payments", selectedPayments.join(","));
                if (selectedServices.length)
                    params.set("services", selectedServices.join(","));
                if (selectedGender) params.set("gender", selectedGender);
                if (startDate) params.set("startDate", startDate);
                if (endDate) params.set("endDate", endDate);

                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/dashboard/analytics?${params.toString()}`,
                );
                const data = await res.json();

                if (cancelled) return;

                if (data.success) {
                    setAnalytics({
                        paymentSummary: data.paymentSummary || [],
                        serviceSummary: data.serviceSummary || [],
                        monthlyTrend: data.monthlyTrend || [],
                        totalRevenue: data.totalRevenue || 0,
                        totalCollection: data.totalCollection || 0,
                        totalPending: data.totalPending || 0,
                        totalVisits: data.totalVisits || 0,
                        totalDiscount: data.totalDiscount || 0,
                        serviceFilterActive: data.serviceFilterActive || false,
                        avgRevenuePerVisit:
                            data.totalVisits > 0
                                ? Math.round(
                                      data.totalRevenue / data.totalVisits,
                                  )
                                : 0,
                    });
                    setTimeout(() => setAnimated(true), 100);
                }
            } catch (e) {
                if (!cancelled)
                    console.error("[Dashboard] analytics fetch error:", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetch$();
        return () => {
            cancelled = true;
        };
    }, [
        plan,
        selectedPayments,
        selectedServices,
        selectedGender,
        startDate,
        endDate,
        dateRangeValid,
    ]);

    // ── Chart data (memoised) ─────────────────────────────────────────────────

    const paymentChartData = useMemo(
        () => ({
            labels:
                analytics?.paymentSummary.map((p) => {
                    const match = paymentOptions.find(
                        (opt) => String(opt.id) === String(p.type),
                    );
                    return match
                        ? (match.subCategoryName || match.categoryName).split(
                              " ",
                          )[0]
                        : "Other";
                }) || [],
            datasets: [
                {
                    data: analytics?.paymentSummary.map((p) => p.total) || [],
                    backgroundColor: DONUT_COLORS,
                    borderWidth: 0,
                    hoverOffset: 8,
                },
            ],
        }),
        [analytics?.paymentSummary, paymentOptions],
    );

    const serviceChartData = useMemo(
        () => ({
            labels: analytics?.serviceSummary.map((s) => s.service) || [],
            datasets: [
                {
                    label: `Revenue (${currency?.symbol || "₹"})`,
                    data: analytics?.serviceSummary.map((s) => s.total) || [],
                    backgroundColor: DONUT_COLORS.slice(
                        0,
                        analytics?.serviceSummary.length || 0,
                    ),
                    borderRadius: 6,
                    borderSkipped: false,
                },
            ],
        }),
        [analytics?.serviceSummary, currency?.symbol],
    );

    // Backend returns { year, month, total, label } — use label directly
    const trendChartData = useMemo(() => {
        const trend = analytics?.monthlyTrend || [];
        return {
            labels: trend.map((t) => t.label || `${t.month}/${t.year}`),
            datasets: [
                {
                    label: "Revenue",
                    data: trend.map((t) => t.revenue || t.total || 0),
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59,130,246,0.08)",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "#3b82f6",
                    pointBorderColor: "#0d1117",
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                },
            ],
        };
    }, [analytics?.monthlyTrend]);

    // ── Chart options (memoised — depend on currency/fmt only) ───────────────

    const donutOpts = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            animation: { animateRotate: true, duration: 800 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0d1421",
                    borderColor: "#1e2d42",
                    borderWidth: 1,
                    padding: 12,
                    titleColor: "#e2e8f0",
                    bodyColor: "#94a3b8",
                    callbacks: {
                        label: (ctx) =>
                            ` ${currency?.symbol || "₹"} ${fmt(ctx.raw)}`,
                    },
                },
            },
        }),
        [currency?.symbol, fmt],
    );

    const barOpts = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700, easing: "easeOutQuart" },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#0d1421",
                    borderColor: "#1e2d42",
                    borderWidth: 1,
                    padding: 12,
                    titleColor: "#e2e8f0",
                    bodyColor: "#94a3b8",
                    callbacks: {
                        label: (ctx) =>
                            ` ${currency?.symbol || "₹"} ${fmt(ctx.raw)}`,
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: "#64748b", font: { size: 11 } },
                    grid: { display: false },
                    border: { display: false },
                },
                y: {
                    ticks: {
                        color: "#64748b",
                        font: { size: 11 },
                        callback: (v) => `${currency?.symbol || "₹"}${fmt(v)}`,
                    },
                    grid: { color: "rgba(255,255,255,0.04)" },
                    border: { display: false },
                },
            },
        }),
        [currency?.symbol, fmt],
    );

    const lineOpts = useMemo(
        () => ({
            ...barOpts,
            scales: {
                ...barOpts.scales,
                y: {
                    ...barOpts.scales.y,
                    ticks: {
                        ...barOpts.scales.y.ticks,
                        callback: (v) => `${currency?.symbol || "₹"}${fmt(v)}`,
                    },
                },
            },
        }),
        [barOpts, currency?.symbol, fmt],
    );

    // ── Derived flags ─────────────────────────────────────────────────────────
    const isLocked = plan !== null && !["PRO", "ENTERPRISE"].includes(plan);
    const serviceFilterActive = analytics?.serviceFilterActive || false;

    // ── Waiting for plan resolution ───────────────────────────────────────────
    if (plan === null) {
        return (
            <div className="db-loading-state">
                <span className="db-loading-dot" />
                <span className="db-loading-dot" />
                <span className="db-loading-dot" />
            </div>
        );
    }

    if (!currency?.symbol) return <DashboardSkeleton />;

    // Shared props for DashboardContent (locked + unlocked render)
    const contentProps = {
        currency,
        paymentOptions,
        paymentChartData,
        serviceChartData,
        trendChartData,
        donutOpts,
        barOpts,
        lineOpts,
    };

    return (
        <>
            <div className="db-root">
                {/* Header */}
                <div className="db-header">
                    <div className="db-header-left">
                        <div className="db-eyebrow">Analytics</div>
                        <h1 className="db-title">
                            Revenue <em>Overview</em>
                        </h1>
                    </div>
                    {!isLocked && (
                        <button
                            className="db-filter-btn"
                            onClick={() => setFilterOpen((prev) => !prev)}
                        >
                            <SlidersHorizontal size={14} /> Filters
                            {activeFiltersCount > 0 && (
                                <span className="pl-filter-badge">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Date range error — shown above charts, never blocks the UI */}
                {dateError && (
                    <div
                        className="db-date-error"
                        role="alert"
                        aria-live="polite"
                    >
                        {dateError}
                    </div>
                )}

                {isLocked ? (
                    /* Locked overlay */
                    <div className="db-lock-wrap">
                        <div className="db-blur-layer">
                            {/* Render zeroed-out content behind the blur */}
                            <DashboardContent
                                {...contentProps}
                                analytics={null}
                                animated={false}
                                serviceFilterActive={false}
                            />
                        </div>
                        <div className="db-lock-overlay">
                            <div className="db-lock-card">
                                <div className="db-lock-icon">
                                    <LockIcon size={22} />
                                </div>
                                <div className="db-lock-title">
                                    {plan === "EXPIRED"
                                        ? "Subscription Expired"
                                        : "Analytics Locked"}
                                </div>
                                <p className="db-lock-body">
                                    {plan === "EXPIRED"
                                        ? "Your plan has expired. Renew to regain full access to revenue analytics and insights."
                                        : "Upgrade to Pro or Enterprise to unlock advanced analytics, revenue insights, and more."}
                                </p>
                                <Link
                                    to="/subscriptionpage"
                                    className="db-upgrade-btn"
                                >
                                    {plan === "EXPIRED"
                                        ? "Renew Plan"
                                        : "Upgrade to Pro"}
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : loading ? (
                    <DashboardSkeleton />
                ) : (
                    <DashboardContent
                        {...contentProps}
                        analytics={analytics}
                        animated={animated}
                        serviceFilterActive={serviceFilterActive}
                    />
                )}
            </div>

            <FilterPanel
                open={filterOpen}
                setOpen={setFilterOpen}
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
                isdashboard={true}
                country={country}
                clinicTimezone={clinicTimezone}
            />
        </>
    );
}
