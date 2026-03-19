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
import { SlidersHorizontal, IndianRupee, LockIcon } from "lucide-react";
import { Link } from "react-router";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
);

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

    // FILTER STATES
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedStatus, setSelectedStatus] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");
    const [filterOpen, setFilterOpen] = useState(false);
    const [themeVersion, setThemeVersion] = useState(0);
    const [chartColors, setChartColors] = useState({
        textColor: "#1f2937",
        gridColor: "rgba(0,0,0,0.08)",
    });
    const [plan, setPlan] = useState(null);
    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN").format(value);
    };

    const getGradient = (ctx, chartArea) => {
        if (!chartArea) return "#0D6EFD";

        const gradient = ctx.createLinearGradient(
            0,
            chartArea.bottom,
            0,
            chartArea.top,
        );

        gradient.addColorStop(0, "#0D6EFD");
        gradient.addColorStop(1, "#60A5FA");

        return gradient;
    };

    useEffect(() => {
        const fetchSubscription = async () => {
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
                    const sub = data.subscription;

                    // 🔥 HANDLE EXPIRED FIRST
                    if (sub.status === "expired") {
                        setPlan("EXPIRED");
                    } else {
                        setPlan(sub.plan?.toUpperCase() || "FREE");
                    }
                } else {
                    setPlan("FREE");
                }
            } catch (err) {
                console.error("Subscription fetch error:", err);
                setPlan("FREE");
            }
        };

        fetchSubscription();
    }, [API_BASE_URL]);

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setThemeVersion((prev) => prev + 1);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const updateColors = () => {
            const styles = getComputedStyle(document.body);

            setChartColors({
                textColor: styles.getPropertyValue("--chart-text").trim(),
                gridColor: styles.getPropertyValue("--chart-grid").trim(),
            });
        };

        updateColors();

        const observer = new MutationObserver(updateColors);

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    /* ================= FETCH ANALYTICS ================= */
    useEffect(() => {
        if (!["PRO", "ENTERPRISE"].includes(plan)) return;

        const fetchAnalytics = async () => {
            try {
                setLoading(true);

                const params = new URLSearchParams({
                    payments: selectedPayments.join(","),
                    services: selectedServices.join(","),
                    gender: selectedGender,
                    startDate,
                    endDate,
                }).toString();

                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/dashboard/analytics?${params}`,
                );

                const data = await res.json();

                if (data.success) {
                    setAnalytics({
                        paymentSummary: data.paymentSummary || [],
                        serviceSummary: data.serviceSummary || [],
                        totalRevenue: data.totalRevenue || 0,
                        totalCollection: data.totalCollection || 0,
                        totalPending: data.totalPending || 0,
                        totalVisits: data.totalVisits || 0,
                    });
                }
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [
        API_BASE_URL,
        plan,
        selectedPayments,
        selectedServices,
        selectedGender,
        startDate,
        endDate,
    ]);

    /* ================= FETCH SERVICES ================= */
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/services/fetchall_services`,
                );

                const data = await res.json();

                if (data.success && Array.isArray(data.services)) {
                    setAllServices(data.services.map((s) => s.name).sort());
                }
            } catch (err) {
                console.error("Service fetch error:", err);
            }
        };

        fetchServices();
    }, [API_BASE_URL]);

    /* ================= CHART DATA ================= */
    const paymentChartData = useMemo(
        () => ({
            labels: analytics.paymentSummary.map((p) => p.type),
            datasets: [
                {
                    data: analytics.paymentSummary.map((p) => p.total),
                    backgroundColor: [
                        "#0D6EFD",
                        "#198754",
                        "#FFC107",
                        "#0DCAF0",
                        "#6F42C1",
                        "#ADB5BD",
                    ],
                },
            ],
        }),
        [analytics.paymentSummary],
    );

    const serviceChartData = useMemo(() => {
        return {
            labels: analytics.serviceSummary.map((s) => s.service),
            datasets: [
                {
                    label: "Revenue (<IndianRupee size={18}/>)",
                    data: analytics.serviceSummary.map((s) => s.total),
                    backgroundColor: (context) => {
                        const { chart } = context;
                        const { ctx, chartArea } = chart;
                        return getGradient(ctx, chartArea);
                    },
                    borderRadius: 10,
                    borderSkipped: false,
                },
            ],
        };
    }, [analytics.serviceSummary]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: "easeOutQuart",
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "#020617",
                borderColor: "#1e293b",
                borderWidth: 1,
                padding: 10,
                titleColor: "#e5e7eb",
                bodyColor: "#e5e7eb",
                callbacks: {
                    label: function (context) {
                        return `<IndianRupee size={18}/> ${formatCurrency(context.raw)}`;
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: {
                    color: chartColors.textColor,
                },
                grid: {
                    display: false,
                },
            },
            y: {
                ticks: {
                    color: chartColors.textColor,
                    callback: function (value) {
                        return "<IndianRupee size={18}/> " + formatCurrency(value);
                    },
                },
                grid: {
                    color: chartColors.gridColor,
                },
            },
        },
    };
    function renderDashboardContent() {
        return (
            <div className="container mt-4 mb-5">
                {/* KPI */}
                <div className="row g-3 mb-4">
                    <KPI title="Total Revenue" value={analytics.totalRevenue} />
                    <KPI title="Collected" value={analytics.totalCollection} />
                    <KPI title="Pending" value={analytics.totalPending} />
                    <KPI
                        title="Total Visits"
                        value={analytics.totalVisits}
                        isCurrency={false}
                    />
                </div>

                {/* Charts */}
                <div className="row g-4">...</div>
            </div>
        );
    }
    if (plan === null) {
        return (
            <div className="container text-center mt-5">
                <p className="text-theme-secondary">Loading dashboard...</p>
            </div>
        );
    }

    if (!["PRO", "ENTERPRISE"].includes(plan)) {
        return (
            <div className="container mt-4 mb-5">
                <div className="dashboard-wrapper">
                    {/* BLURRED DASHBOARD */}
                    <div
                        className={
                            plan !== "PRO" && plan !== "ENTERPRISE"
                                ? "dashboard-blur"
                                : ""
                        }
                    >
                        {renderDashboardContent()}
                    </div>

                    {/* LOCK OVERLAY */}
                    {plan !== "PRO" && plan !== "ENTERPRISE" && (
                        <div className="dashboard-lock-overlay">
                            <div className="lock-card">
                                <div className="lock-icon"><LockIcon size={50}/></div>

                                <p className="text-theme-secondary fw-bold">
                                    {plan === "EXPIRED"
                                        ? "Your subscription has expired"
                                        : "Analytics Locked"}
                                </p>

                                <p className="text-theme-secondary">
                                    {plan === "EXPIRED"
                                        ? "Renew your plan to regain access to analytics."
                                        : "Upgrade to Pro or Enterprise to unlock advanced analytics."}
                                </p>

                                <p className="text-theme-secondary">
                                    Upgrade to <strong>Pro</strong> or{" "}
                                    <strong>Enterprise</strong>
                                    to unlock advanced analytics and revenue
                                    insights.
                                </p>

                                <Link
                                    to="/subscriptionpage"
                                    className="btn btn-primary"
                                >
                                    Upgrade Plan
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return (
        <div className="container mt-4 mb-5">
            <div className="dashboard-header">
                <div>
                    <h3 className="fw-bold mb-1">Dashboard</h3>
                    <small className="text-theme-secondary">
                        Overview of revenue, collections & services
                    </small>
                </div>

                <button
                    className="btn btn-outline-theme btn-sm d-flex align-items-center gap-2"
                    onClick={() => setFilterOpen(true)}
                >
                    <SlidersHorizontal size={16} />
                    Filters
                </button>
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

            {loading && (
                <p className="text-center text-theme-secondary mt-3">
                    Updating dashboard…
                </p>
            )}

            {/* ================= KPI CARDS ================= */}
            <div className="row g-3 mb-4">
                <KPI
                    title="Total Revenue"
                    value={analytics.totalRevenue}
                    color="primary"
                />
                <KPI
                    title="Collected"
                    value={analytics.totalCollection}
                    color="success"
                />
                <KPI
                    title="Pending"
                    value={analytics.totalPending}
                    color="danger"
                />
                <KPI
                    title="Total Visits"
                    value={analytics.totalVisits}
                    color="secondary"
                    isCurrency={false}
                />
            </div>

            {/* ================= CHART SECTION ================= */}
            <div className="row g-4">
                {/* Payment Section */}
                <div className="col-lg-6">
                    <div className="dashboard-card p-4 shadow-sm rounded-4">
                        <h6 className="fw-semibold mb-3 text-center">
                            Payment Distribution
                        </h6>

                        <div className="row">
                            <div className="col-md-6">
                                <div style={{ height: 250 }}>
                                    <Doughnut
                                        data={paymentChartData}
                                        options={chartOptions}
                                        key={themeVersion}
                                    />
                                </div>
                            </div>

                            <div className="col-md-6">
                                {analytics.paymentSummary.map((p, index) => {
                                    const percent =
                                        analytics.totalCollection > 0
                                            ? (
                                                  (p.total /
                                                      analytics.totalCollection) *
                                                  100
                                              ).toFixed(1)
                                            : 0;

                                    return (
                                        <div
                                            key={p.type}
                                            className="d-flex justify-content-between align-items-center mb-2"
                                        >
                                            <div className="d-flex align-items-center gap-2">
                                                <span
                                                    style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: "50%",
                                                        backgroundColor: [
                                                            "#0D6EFD",
                                                            "#198754",
                                                            "#FFC107",
                                                            "#0DCAF0",
                                                            "#6F42C1",
                                                            "#ADB5BD",
                                                        ][index],
                                                    }}
                                                ></span>

                                                <span>{p.type}</span>
                                            </div>

                                            <span className="fw-bold">
                                                <IndianRupee size={16} />{" "}
                                                {formatCurrency(p.total)} (
                                                {percent}%)
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Revenue */}
                <div className="col-lg-6">
                    <div className="dashboard-card">
                        {" "}
                        <h6 className="fw-semibold mb-3 text-center">
                            Top Revenue Services
                        </h6>
                        <div style={{ height: 250 }}>
                            <Bar
                                data={serviceChartData}
                                options={chartOptions}
                                key={themeVersion}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ================= KPI COMPONENT ================= */
function KPI({ title, value, color, isCurrency = true }) {
    const formatCurrency = (val) =>
        new Intl.NumberFormat("en-IN").format(Number(val || 0));

    return (
        <div className="col-6 col-md-3">
            <div className="kpi-card">
                <p className="kpi-label">{title}</p>

                <h4 className="kpi-value">
                    {isCurrency ? (
                        <>
                            <IndianRupee size={18} /> {formatCurrency(value)}
                        </>
                    ) : (
                        formatCurrency(value)
                    )}
                </h4>
            </div>
        </div>
    );
}
