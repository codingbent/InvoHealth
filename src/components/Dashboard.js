import { useEffect, useState, useMemo } from "react";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import FilterPanel from "./FilterPanel";
import { authFetch } from "./authfetch";
import {
    SlidersHorizontal,
    IndianRupee,
    LockIcon,
    TrendingUp,
    Users,
    Clock,
} from "lucide-react";
import { Link } from "react-router";
import DashboardSkeleton from "./DashboardSkeleton";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
);

/* ── palette — navy blue theme ── */
const DONUT_COLORS = [
    "#0D6EFD",
    "#198754",
    "#FFC107",
    "#0DCAF0",
    "#6F42C1",
    "#ADB5BD",
];

export default function Dashboard() {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [analytics, setAnalytics] = useState({
        paymentSummary: [],
        serviceSummary: [],
        totalRevenue: 0,
        totalCollection: 0,
        totalPending: 0,
        totalVisits: 0,
    });
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
    const [themeVersion, setThemeVersion] = useState(0);
    const [plan, setPlan] = useState(null);

    const fmt = (v) => new Intl.NumberFormat("en-IN").format(Number(v || 0));

    useEffect(() => {
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
    }, [API_BASE_URL]);

    useEffect(() => {
        const obs = new MutationObserver(() => setThemeVersion((p) => p + 1));
        obs.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!["PRO", "ENTERPRISE"].includes(plan)) return;
        const fetch$ = async () => {
            setLoading(true);
            try {
                const p = new URLSearchParams({
                    payments: selectedPayments.join(","),
                    services: selectedServices.join(","),
                    gender: selectedGender,
                    ...(startDate && { startDate }),
                    ...(endDate && { endDate }),
                }).toString();
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/dashboard/analytics?${p}`,
                );
                const data = await res.json();
                if (data.success)
                    setAnalytics({
                        paymentSummary: data.paymentSummary || [],
                        serviceSummary: data.serviceSummary || [],
                        totalRevenue: data.totalRevenue || 0,
                        totalCollection: data.totalCollection || 0,
                        totalPending: data.totalPending || 0,
                        totalVisits: data.totalVisits || 0,
                    });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch$();
    }, [
        API_BASE_URL,
        plan,
        selectedPayments,
        selectedServices,
        selectedGender,
        startDate,
        endDate,
    ]);

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
    }, [API_BASE_URL]);

    const paymentChartData = useMemo(
        () => ({
            labels: analytics.paymentSummary.map((p) => p.type),
            datasets: [
                {
                    data: analytics.paymentSummary.map((p) => p.total),
                    backgroundColor: DONUT_COLORS,
                    borderWidth: 0,
                    hoverOffset: 6,
                },
            ],
        }),
        [analytics.paymentSummary],
    );

    const serviceChartData = useMemo(
        () => ({
            labels: analytics.serviceSummary.map((s) => s.service),
            datasets: [
                {
                    label: "Revenue (₹)",
                    data: analytics.serviceSummary.map((s) => s.total),
                    backgroundColor: (ctx) => {
                        const { chart } = ctx;
                        const { ctx: c, chartArea: a } = chart;
                        if (!a) return "#4d7cf6";
                        const g = c.createLinearGradient(0, a.bottom, 0, a.top);
                        g.addColorStop(0, "#0891b2");
                        g.addColorStop(1, "#38bdf8");
                        return g;
                    },
                    borderRadius: 8,
                    borderSkipped: false,
                },
            ],
        }),
        [analytics.serviceSummary],
    );

    const baseChartOpts = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: "easeOutQuart" },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: "#0d1117",
                borderColor: "#1e2a3a",
                borderWidth: 1,
                padding: 12,
                titleColor: "#e5e7eb",
                bodyColor: "#e5e7eb",
                callbacks: { label: (ctx) => ` ₹ ${fmt(ctx.raw)}` },
            },
        },
        scales: {
            x: { ticks: { color: "#6b7280" }, grid: { display: false } },
            y: {
                ticks: { color: "#6b7280", callback: (v) => `₹${fmt(v)}` },
                grid: { color: "rgba(255,255,255,0.05)" },
            },
        },
    };

    function DashboardContent() {
        return (
            <>
                <div className="db-kpi-row">
                    <KPI
                        icon={<IndianRupee size={15} />}
                        label="Total Revenue"
                        value={analytics.totalRevenue}
                        accent="#60a5fa"
                    />
                    <KPI
                        icon={<TrendingUp size={15} />}
                        label="Collected"
                        value={analytics.totalCollection}
                        accent="#22c55e"
                    />
                    <KPI
                        icon={<Clock size={15} />}
                        label="Pending"
                        value={analytics.totalPending}
                        accent="#f97316"
                    />
                    <KPI
                        icon={<Users size={15} />}
                        label="Total Visits"
                        value={analytics.totalVisits}
                        accent="#a78bfa"
                        isCurrency={false}
                    />
                </div>

                <div className="db-charts-row">
                    <div className="db-card">
                        <div className="db-card-label">
                            Payment Distribution
                        </div>
                        <div className="db-card-body db-card-split">
                            <div className="db-donut-wrap">
                                <Doughnut
                                    data={paymentChartData}
                                    options={{
                                        ...baseChartOpts,
                                        cutout: "70%",
                                    }}
                                    key={themeVersion}
                                />
                            </div>
                            <ul className="db-legend">
                                {analytics.paymentSummary.map((p, i) => {
                                    const pct =
                                        analytics.totalCollection > 0
                                            ? (
                                                  (p.total /
                                                      analytics.totalCollection) *
                                                  100
                                              ).toFixed(1)
                                            : 0;
                                    return (
                                        <li
                                            key={p.type}
                                            className="db-legend-item"
                                        >
                                            <span
                                                className="db-legend-dot"
                                                style={{
                                                    background: DONUT_COLORS[i],
                                                }}
                                            />
                                            <span className="db-legend-name text-theme-primary">
                                                {p.type}
                                            </span>
                                            <span className="db-legend-val">
                                                ₹{fmt(p.total)}{" "}
                                                <span className="db-legend-pct">
                                                    {pct}%
                                                </span>
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>

                    <div className="db-card">
                        <div className="db-card-label">Revenue by Service</div>
                        <div className="db-card-body" style={{ height: 260 }}>
                            <Bar
                                data={serviceChartData}
                                options={baseChartOpts}
                                key={themeVersion}
                            />
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (plan === null)
        return (
            <div className="db-loading-state">
                <span className="db-loading-dot" />
                <span className="db-loading-dot" />
                <span className="db-loading-dot" />
            </div>
        );

    const isLocked = !["PRO", "ENTERPRISE"].includes(plan);

    return (
        <>
            <div className="db-root">
                <div className="db-header">
                    <div>
                        <div className="db-eyebrow"> Analytics</div>
                        <h1 className="db-title">
                            Revenue <em>Overview</em>
                        </h1>
                    </div>
                    {!isLocked && (
                        <button
                            className="db-filter-btn"
                            onClick={() => setFilterOpen(true)}
                        >
                            <SlidersHorizontal size={14} /> Filters
                        </button>
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
                    isdashboard={true}
                />

                {isLocked ? (
                    <div className="db-wrapper">
                        <div className="db-blur">
                            <DashboardContent />
                        </div>
                        <div className="db-lock-overlay">
                            <div className="db-lock-card">
                                <div className="db-lock-icon">
                                    <LockIcon size={24} />
                                </div>
                                <div className="db-lock-heading">
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
                                        : "Upgrade Plan"}
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : loading ? (
                    <DashboardSkeleton />
                ) : (
                    <DashboardContent />
                )}
            </div>
        </>
    );
}

function KPI({ icon, label, value, accent, isCurrency = true }) {
    const fmt = (v) => new Intl.NumberFormat("en-IN").format(Number(v || 0));
    return (
        <div className="db-kpi">
            <div className="db-kpi-top">
                <span className="db-kpi-label">{label}</span>
                <span
                    className="db-kpi-icon"
                    style={{ background: `${accent}18`, color: accent }}
                >
                    {icon}
                </span>
            </div>
            <div className="db-kpi-value" style={{ color: accent }}>
                {isCurrency && <IndianRupee size={16} />}
                {fmt(value)}
            </div>
        </div>
    );
}
