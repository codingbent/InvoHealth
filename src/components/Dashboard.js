import React from "react";
import { useEffect, useState, useMemo, useRef } from "react";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import DashboardSkeleton from "./DashboardSkeleton";
import { API_BASE_URL } from "../components/config";
import "../css/Dashboard.css"

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

/* ─── Animated counter hook ─── */
function useCountUp(target, duration = 900, enabled = true) {
    const [value, setValue] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;
        const start = performance.now();
        const from = 0;

        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out-quart
            const eased = 1 - Math.pow(1 - progress, 4);
            setValue(Math.round(from + (target - from) * eased));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [target, duration, enabled]);

    return value;
}

/* ─── KPI Card ─── */
function KPI({
    label,
    value,
    accent,
    isCurrency = true,
    icon: Icon,
    trend,
    trendLabel,
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

export default function Dashboard({ currency, subscription, showAlert }) {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
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

    const fmt = (v) => new Intl.NumberFormat("en-IN").format(Number(v || 0));

    /* ── Derive plan from subscription prop first, fallback to API ── */
    useEffect(() => {
        // If parent already passed subscription data, use it directly
        if (subscription) {
            const s = subscription.status;
            const p = subscription.plan?.toUpperCase() || "FREE";
            setPlan(s === "expired" ? "EXPIRED" : p);
            return;
        }

        // Fallback: fetch subscription ourselves
        const fetchSub = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    setPlan("FREE");
                    return;
                }
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

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchPaymentMethods();
                setPaymentOptions(data);
            } catch {
                showAlert("Failed to load payments", "danger");
            }
        };
        load();
    }, [showAlert]);

    /* ── Fetch analytics — only for PRO/ENTERPRISE ── */
    useEffect(() => {
        if (!plan || !["PRO", "ENTERPRISE"].includes(plan)) return;

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
                        avgRevenuePerVisit:
                            data.totalVisits > 0
                                ? Math.round(
                                      data.totalRevenue / data.totalVisits,
                                  )
                                : 0,
                    });
                    // Trigger counter animation after data loads
                    setTimeout(() => setAnimated(true), 100);
                }
            } catch (e) {
                console.error("Analytics fetch error:", e);
            } finally {
                setLoading(false);
            }
        };
        fetch$();
    }, [
        plan,
        selectedPayments,
        selectedServices,
        selectedGender,
        startDate,
        endDate,
    ]);

    /* ── Fetch services for filter panel ── */
    useEffect(() => {
        const fetch$ = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/services/fetchall_services`,
                );
                const data = await res.json();
                if (data.success && Array.isArray(data.services))
                    setAllServices(data.services.map((s) => s.name).sort());
            } catch (e) {
                console.error(e);
            }
        };
        fetch$();
    }, []);

    /* ── Chart configs ── */
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

    /* Monthly trend chart — uses data from API if available, else empty */
    const trendChartData = useMemo(() => {
        const trend = analytics?.monthlyTrend || [];
        return {
            labels: trend.map((t) => t.month || t.label || ""),
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

    const donutOpts = {
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
    };

    const barOpts = {
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
    };

    const lineOpts = {
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
    };

    const isLocked = plan !== null && !["PRO", "ENTERPRISE"].includes(plan);
    const hasPaymentData = (analytics?.paymentSummary?.length || 0) > 0;
    const hasServiceData = (analytics?.serviceSummary?.length || 0) > 0;
    const hasTrendData = (analytics?.monthlyTrend?.length || 0) > 0;

    function EmptyChart({ icon: Icon, label }) {
        return (
            <div className="db-empty-chart">
                <Icon size={28} strokeWidth={1.2} />
                <span>{label}</span>
            </div>
        );
    }

    const DashboardContent = React.memo(function DashboardContent({
        analytics,
        currency,
        animated,
    }) {
        return (
            <div className="db-content">
                {/* KPI row */}
                <div className="db-kpi-row">
                    <KPI
                        icon={IndianRupee}
                        label="Gross Revenue"
                        value={
                            analytics?.totalCollection +
                            analytics?.totalDiscount
                        }
                        accent="#3b82f6"
                        currencySymbol={currency?.symbol || "₹"}
                        animated={animated}
                    />
                    <KPI
                        icon={TrendingUp}
                        label="Collected"
                        value={analytics?.totalCollection}
                        accent="#22c55e"
                        currencySymbol={currency?.symbol || "₹"}
                        animated={animated}
                    />
                    <KPI
                        icon={Clock}
                        label="Pending"
                        value={analytics?.totalPending}
                        accent="#f59e0b"
                        currencySymbol={currency?.symbol || "₹"}
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
                        currencySymbol={currency?.symbol || "₹"}
                        animated={animated}
                    />
                </div>

                {/* Charts row 1: Donut + Bar */}
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
                                                String(opt.id) ===
                                                String(p.type),
                                        );

                                        const label = match
                                            ? (
                                                  match.subCategoryName ||
                                                  match.categoryName
                                              ).split(" ")[0]
                                            : "Other";
                                        return (
                                            <li
                                                key={p.type}
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
                                                    {currency?.symbol}
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
                                        Add appointments to see payment
                                        breakdown
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Revenue by Service */}
                    <div className="db-card">
                        <div className="db-card-head">
                            <BarChart3 size={14} />
                            <span>Revenue by Service</span>
                        </div>
                        <div className="db-card-body" style={{ height: 240 }}>
                            {hasServiceData ? (
                                <Bar
                                    data={serviceChartData}
                                    options={barOpts}
                                />
                            ) : (
                                <EmptyChart
                                    icon={BarChart3}
                                    label="No service data yet"
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Charts row 2: Line trend + Collection vs Pending */}
                <div className="db-row">
                    {/* Monthly Revenue Trend */}
                    <div className="db-card db-card-wide">
                        <div className="db-card-head">
                            <Activity size={14} />
                            <span>Monthly Revenue Trend</span>
                            <span className="db-card-badge">
                                Last 12 months
                            </span>
                        </div>
                        <div className="db-card-body" style={{ height: 200 }}>
                            {hasTrendData ? (
                                <Line
                                    data={trendChartData}
                                    options={lineOpts}
                                />
                            ) : (
                                <EmptyChart
                                    icon={Activity}
                                    label="Trend data needs monthlyTrend from your analytics API"
                                />
                            )}
                        </div>
                    </div>

                    {/* Collection vs Pending split */}
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
                                    {currency?.symbol}
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
                                    {currency?.symbol}
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
                                                      analytics.totalRevenue) *
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
                                                    ? `${Math.min((analytics.totalCollection / analytics.totalRevenue) * 100, 100)}%`
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
                                    Total Revenue
                                </div>
                                <div
                                    className="db-summary-val"
                                    style={{ color: "#3b82f6" }}
                                >
                                    {currency?.symbol}
                                    {fmt(analytics?.totalRevenue)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    });

    /* ── Loading state ── */
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
                        </button>
                    )}
                </div>

                {/* Locked overlay */}
                {isLocked ? (
                    <div className="db-lock-wrap">
                        <div className="db-blur-layer">
                            <DashboardContent />
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
                        analytics={analytics}
                        currency={currency}
                        animated={animated}
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
            />
        </>
    );
}
