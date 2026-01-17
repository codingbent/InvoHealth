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

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement
);

export default function Dashboard() {
    const [analytics, setAnalytics] = useState({
        paymentSummary: [],
        serviceSummary: [],
        totalCollection: 0,
        totalVisits: 0,
    });
    const [loading, setLoading] = useState(false);
    const [allServices, setAllServices] = useState([]);

    // FILTER STATES
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayments, setSelectedPayments] = useState([]);
    const [selectedGender, setSelectedGender] = useState("");
    const [selectedServices, setSelectedServices] = useState([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedFY, setSelectedFY] = useState("");
    const [theme, setTheme] = useState(
        document.body.classList.contains("dark-theme") ? "dark" : "light"
    );

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setTheme(
                document.body.classList.contains("dark-theme")
                    ? "dark"
                    : "light"
            );
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    const chartColors = useMemo(() => {
        if (theme === "dark") {
            return {
                text: "#E5E7EB",
                grid: "#1E293B",
                tooltipBg: "#111827",
                cardBg: "#111827",
                primary: "#3B82F6",
                success: "#22C55E",
            };
        }

        return {
            text: "#0F172A",
            grid: "#E5E7EB",
            tooltipBg: "#ffffff",
            cardBg: "#ffffff",
            primary: "#0D6EFD",
            success: "#198754",
        };
    }, [theme]);

    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        []
    );

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
                    `${API_BASE_URL}/api/auth/dashboard/analytics?${params}`
                );

                const data = await res.json();
                if (data.success) {
                    setAnalytics({
                        paymentSummary: data.paymentSummary || [],
                        serviceSummary: data.serviceSummary || [],
                        totalCollection: data.totalCollection || 0,
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
                    `${API_BASE_URL}/api/auth/fetchallservice`
                );
                const data = await res.json();

                setAllServices(
                    Array.isArray(data.services)
                        ? data.services.map((s) => s.name).sort()
                        : []
                );
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
                    backgroundColor:
                        theme === "dark"
                            ? [
                                  "#3B82F6",
                                  "#22C55E",
                                  "#F59E0B",
                                  "#06B6D4",
                                  "#8B5CF6",
                                  "#64748B",
                              ]
                            : [
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
        [analytics.paymentSummary, theme]
    );

    const serviceChartData = useMemo(
        () => ({
            labels: analytics.serviceSummary.map((s) => s.service),
            datasets: [
                {
                    label: "Revenue (₹)",
                    data: analytics.serviceSummary.map((s) => s.total),
                    backgroundColor: chartColors.primary,
                    borderRadius: 8,
                },
            ],
        }),
        [analytics.serviceSummary, chartColors]
    );

    const chartOptions = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: chartColors.text,
                        boxWidth: 12,
                        padding: 16,
                    },
                },
                tooltip: {
                    backgroundColor: chartColors.tooltipBg,
                    titleColor: chartColors.text,
                    bodyColor: chartColors.text,
                    padding: 10,
                    cornerRadius: 8,
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: chartColors.text,
                    },
                    grid: {
                        color: chartColors.grid,
                    },
                },
                y: {
                    ticks: {
                        color: chartColors.text,
                    },
                    grid: {
                        color: chartColors.grid,
                    },
                },
            },
        }),
        [chartColors]
    );

    return (
        <div className="container mt-4 mb-5">
            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">📊 Dashboard</h3>
            </div>

            {/* FILTER PANEL (NEVER UNMOUNTS) */}
            <FilterPanel
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedPayments={selectedPayments}
                setSelectedPayments={setSelectedPayments}
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

            {/* LOADING INDICATOR */}
            {loading && (
                <p className="text-center text-theme-muted mt-4">
                    Updating dashboard…
                </p>
            )}

            {/* KPI CARDS */}
            <div className="row g-3 mb-4">
                <div className="col-md-6">
                    <div className="dashboard-card">
                        <p className="text-theme-muted small">
                            Total Collection
                        </p>
                        <h3 className="fw-bold text-success">
                            ₹ {analytics.totalCollection.toFixed(2)}
                        </h3>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="dashboard-card">
                        <p className="text-theme-muted small">Total Visits</p>
                        <h3 className="fw-bold text-primary">
                            {analytics.totalVisits}
                        </h3>
                    </div>
                </div>
            </div>

            {/* CHARTS */}
            <div className="row g-4">
                <div className="col-lg-6">
                    <div className="dashboard-card chart-card">
                        <h6 className="text-center fw-semibold mb-3">
                            Payment Distribution
                        </h6>
                        <div className="chart-wrapper">
                            <Doughnut
                                data={paymentChartData}
                                options={chartOptions}
                            />
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="dashboard-card chart-card">
                        <h6 className="text-center fw-semibold mb-3">
                            Service-wise Revenue
                        </h6>
                        <div className="chart-wrapper">
                            <Bar
                                data={serviceChartData}
                                options={chartOptions}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
