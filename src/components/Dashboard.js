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
import { SlidersHorizontal } from "lucide-react";

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
);

export default function Dashboard() {
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
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    /* ================= FETCH ANALYTICS ================= */
    useEffect(() => {
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

    const serviceChartData = useMemo(
        () => ({
            labels: analytics.serviceSummary.map((s) => s.service),
            datasets: [
                {
                    label: "Revenue (₹)",
                    data: analytics.serviceSummary.map((s) => s.total),
                    backgroundColor: "#0D6EFD",
                    borderRadius: 8,
                },
            ],
        }),
        [analytics.serviceSummary],
    );

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: chartColors.textColor,
                },
            },
        },
        scales: {
            x: {
                ticks: { color: chartColors.textColor },
                grid: { color: chartColors.gridColor },
            },
            y: {
                ticks: { color: chartColors.textColor },
                grid: { color: chartColors.gridColor },
            },
        },
    };

    return (
        <div className="container mt-4 mb-5">
            <div className="dashboard-header">
                <div>
                    <h3 className="fw-bold mb-1">Clinic Dashboard</h3>
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
                <p className="text-center text-muted mt-3">
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
                                {analytics.paymentSummary.map((p) => {
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
                                            className="d-flex justify-content-between mb-2"
                                        >
                                            <span>{p.type}</span>
                                            <span className="fw-bold">
                                                ₹ {p.total.toFixed(0)} (
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
    return (
        <div className="col-6 col-md-3">
            <div className="kpi-card">
                <p className="kpi-label">{title}</p>
                <h4 className="kpi-value">
                    {isCurrency ? `₹ ${value.toFixed(0)}` : value}
                </h4>
            </div>
        </div>
    );
}
