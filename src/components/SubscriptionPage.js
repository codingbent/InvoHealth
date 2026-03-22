import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Pricing from "./Pricing";
import {
    IndianRupee,
    Calendar,
    Clock,
    CreditCard,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    FileSpreadsheet,
    FileText,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

export default function SubscriptionPage(props) {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [data, setData] = useState(null);
    const [payments, setPayments] = useState([]);
    const [pricing, setPricing] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        async function loadData() {
            try {
                const [subscriptionRes, paymentRes, pricingRes] =
                    await Promise.all([
                        axios.get(`${API_BASE_URL}/api/doctor/subscription`, {
                            headers: { "auth-token": token },
                        }),
                        axios.get(
                            `${API_BASE_URL}/api/doctor/payment-history`,
                            { headers: { "auth-token": token } },
                        ),
                        fetch(`${API_BASE_URL}/api/admin/pricing`),
                    ]);
                const pricingData = await pricingRes.json();
                if (subscriptionRes.data.success) setData(subscriptionRes.data);
                if (paymentRes.data.success)
                    setPayments(paymentRes.data.payments);
                if (pricingData.success) setPricing(pricingData.pricing);
            } catch (err) {
                console.error("Subscription page error:", err);
            }
        }
        loadData();
    }, [API_BASE_URL]);

    const sortedPayments = useMemo(
        () =>
            [...payments].sort(
                (a, b) => new Date(b.paidAt) - new Date(a.paidAt),
            ),
        [payments],
    );

    if (!data || !pricing) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "60vh",
                    gap: 8,
                }}
            >
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#2e3d5c",
                        animation: "sp-pulse 1.2s ease-in-out infinite",
                        display: "inline-block",
                    }}
                />
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#2e3d5c",
                        animation: "sp-pulse 1.2s ease-in-out 0.2s infinite",
                        display: "inline-block",
                    }}
                />
                <span
                    style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#2e3d5c",
                        animation: "sp-pulse 1.2s ease-in-out 0.4s infinite",
                        display: "inline-block",
                    }}
                />
            </div>
        );
    }

    const { subscription, usage } = data;
    const isExpired = subscription.status === "expired";
    const safeUsage = isExpired
        ? { excelExports: 0, invoiceDownloads: 0 }
        : usage;
    const planKey = subscription.plan.toLowerCase();
    const planLimits =
        planKey === "free"
            ? { excelLimit: 2, invoiceLimit: 2 }
            : (pricing?.[planKey] ?? { excelLimit: 0, invoiceLimit: 0 });
    const baseExcelLimit = planLimits.excelLimit ?? -1;
    const baseInvoiceLimit = planLimits.invoiceLimit ?? -1;
    const billingCycle = subscription.billingCycle || "monthly";
    const excelLimit =
        baseExcelLimit === -1
            ? -1
            : billingCycle === "yearly"
              ? baseExcelLimit * 12
              : baseExcelLimit;
    const invoiceLimit =
        baseInvoiceLimit === -1
            ? -1
            : billingCycle === "yearly"
              ? baseInvoiceLimit * 12
              : baseInvoiceLimit;
    const startDate = subscription.startDate
        ? new Date(subscription.startDate).toLocaleDateString("en-IN")
        : "-";
    const expiryDate = subscription.expiryDate
        ? new Date(subscription.expiryDate).toLocaleDateString("en-IN")
        : "No Expiry";
    const excelPercent =
        isExpired || excelLimit <= 0
            ? 0
            : excelLimit === -1
              ? safeUsage.excelExports > 0
                  ? 10
                  : 0
              : Math.min(100, (safeUsage.excelExports / excelLimit) * 100);
    const invoicePercent =
        isExpired || invoiceLimit === 0
            ? 0
            : invoiceLimit === -1
              ? safeUsage.invoiceDownloads > 0
                  ? 10
                  : 0
              : Math.min(
                    100,
                    (safeUsage.invoiceDownloads / invoiceLimit) * 100,
                );
    const lastPayment = sortedPayments[0] || null;
    const lastPlan = lastPayment?.plan || subscription.plan;
    const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);
    const paginatedPayments = sortedPayments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    const planName =
        isExpired && lastPayment
            ? lastPlan.toUpperCase()
            : subscription.plan.toUpperCase();
    const statusColor =
        subscription.status === "active"
            ? "#4ade80"
            : subscription.status === "expired"
              ? "#fb923c"
              : "#f87171";
    const statusLabel =
        subscription.status === "expired"
            ? "EXPIRED"
            : subscription.status.toUpperCase();

    const PLAN_COLORS = {
        free: "#94a3b8",
        starter: "#60a5fa",
        pro: "#a78bfa",
        enterprise: "#fb923c",
    };
    const planColor = PLAN_COLORS[planKey] || "#60a5fa";

    const paymentStatusStyle = (s) => {
        const st = (s || "success").toLowerCase();
        if (st === "success")
            return {
                bg: "rgba(74,222,128,0.1)",
                border: "rgba(74,222,128,0.2)",
                color: "#4ade80",
            };
        if (st === "failed")
            return {
                bg: "rgba(248,113,113,0.1)",
                border: "rgba(248,113,113,0.2)",
                color: "#f87171",
            };
        if (st === "pending")
            return {
                bg: "rgba(251,146,60,0.1)",
                border: "rgba(251,146,60,0.2)",
                color: "#fb923c",
            };
        return {
            bg: "rgba(148,163,184,0.1)",
            border: "rgba(148,163,184,0.2)",
            color: "#94a3b8",
        };
    };

    return (
        <>
            <div className="sp-root">
                {/* Header */}
                <div className="sp-header">
                    <h1 className="sp-title">
                        Billing &amp; <em>Subscription</em>
                    </h1>
                </div>

                {/* ── Plan Card ── */}
                <div className="sp-card" style={{ "--accent": planColor }}>
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: "10%",
                            right: "10%",
                            height: 1,
                            background: `linear-gradient(90deg, transparent, ${planColor}55, transparent)`,
                        }}
                    />
                    <div className="sp-card-header">
                        <div
                            className="sp-card-icon"
                            style={{
                                background: `${planColor}18`,
                                color: planColor,
                            }}
                        >
                            <CreditCard size={15} />
                        </div>
                        <div className="sp-card-title">Current Plan</div>
                    </div>
                    <div className="sp-card-body">
                        <div className="sp-plan-row">
                            <div>
                                <div
                                    className="sp-plan-name"
                                    style={{ color: planColor }}
                                >
                                    {planName}
                                </div>
                                <span
                                    className="sp-status-badge"
                                    style={{
                                        background: `${statusColor}12`,
                                        borderColor: `${statusColor}30`,
                                        color: statusColor,
                                    }}
                                >
                                    {subscription.status === "active" ? (
                                        <CheckCircle size={10} />
                                    ) : (
                                        <AlertTriangle size={10} />
                                    )}
                                    {statusLabel}
                                </span>
                            </div>
                            <div className="sp-days-box">
                                <div className="sp-days-label">
                                    Days Remaining
                                </div>
                                <div className="sp-days-value">
                                    {isExpired
                                        ? "0"
                                        : subscription.plan === "FREE"
                                          ? "∞"
                                          : subscription.daysRemaining}
                                </div>
                            </div>
                        </div>

                        <div className="sp-meta-grid">
                            <div className="sp-meta-item">
                                <div className="sp-meta-label">
                                    <Calendar
                                        size={10}
                                        style={{
                                            display: "inline",
                                            marginRight: 5,
                                        }}
                                    />
                                    Start Date
                                </div>
                                <div className="sp-meta-value">{startDate}</div>
                            </div>
                            <div className="sp-meta-item">
                                <div className="sp-meta-label">
                                    <Clock
                                        size={10}
                                        style={{
                                            display: "inline",
                                            marginRight: 5,
                                        }}
                                    />
                                    Expiry Date
                                </div>
                                <div className="sp-meta-value">
                                    {expiryDate}
                                </div>
                            </div>
                            <div className="sp-meta-item">
                                <div className="sp-meta-label">
                                    <RefreshCw
                                        size={10}
                                        style={{
                                            display: "inline",
                                            marginRight: 5,
                                        }}
                                    />
                                    Billing Cycle
                                </div>
                                <div className="sp-meta-value">
                                    {(billingCycle || "").toUpperCase()}
                                </div>
                            </div>
                            <div className="sp-meta-item">
                                <div className="sp-meta-label">
                                    <IndianRupee
                                        size={10}
                                        style={{
                                            display: "inline",
                                            marginRight: 5,
                                        }}
                                    />
                                    Currency
                                </div>
                                <div className="sp-meta-value">
                                    {subscription.currency}
                                </div>
                            </div>
                        </div>

                        {isExpired && (
                            <div className="sp-expired-alert">
                                <AlertTriangle
                                    size={16}
                                    style={{ flexShrink: 0 }}
                                />
                                <span>
                                    Your{" "}
                                    <strong>{lastPlan.toUpperCase()}</strong>{" "}
                                    plan has expired.{" "}
                                    <a
                                        href="#pricing"
                                        className="sp-upgrade-link"
                                    >
                                        Upgrade now
                                    </a>{" "}
                                    to continue using all features.
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Usage Card ── */}
                <div className="sp-card">
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: "10%",
                            right: "10%",
                            height: 1,
                            background:
                                "linear-gradient(90deg, transparent, rgba(77,124,246,0.35), transparent)",
                        }}
                    />
                    <div className="sp-card-header">
                        <div
                            className="sp-card-icon"
                            style={{
                                background: "rgba(77,124,246,0.1)",
                                color: "#60a5fa",
                            }}
                        >
                            <FileSpreadsheet size={15} />
                        </div>
                        <div className="sp-card-title">Plan Usage</div>
                    </div>
                    <div className="sp-card-body">
                        <div className="sp-usage-item">
                            <div className="sp-usage-row">
                                <span className="sp-usage-label">
                                    <FileSpreadsheet size={12} /> Excel Exports
                                </span>
                                <span className="sp-usage-val">
                                    {safeUsage.excelExports} /{" "}
                                    {excelLimit === -1 ? "∞" : excelLimit}
                                </span>
                            </div>
                            <div className="sp-prog-track">
                                <div
                                    className="sp-prog-fill"
                                    style={{
                                        width: `${excelPercent}%`,
                                        background:
                                            "linear-gradient(90deg, #4d7cf6, #60a5fa)",
                                    }}
                                />
                            </div>
                        </div>
                        <div className="sp-usage-item">
                            <div className="sp-usage-row">
                                <span className="sp-usage-label">
                                    <FileText size={12} /> Invoice Downloads
                                </span>
                                <span className="sp-usage-val">
                                    {safeUsage.invoiceDownloads} /{" "}
                                    {invoiceLimit === -1 ? "∞" : invoiceLimit}
                                </span>
                            </div>
                            <div className="sp-prog-track">
                                <div
                                    className="sp-prog-fill"
                                    style={{
                                        width: `${invoicePercent}%`,
                                        background:
                                            "linear-gradient(90deg, #4ade80, #86efac)",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Payment History ── */}
                <div className="sp-card">
                    <div
                        style={{
                            position: "absolute",
                            top: 0,
                            left: "10%",
                            right: "10%",
                            height: 1,
                            background:
                                "linear-gradient(90deg, transparent, rgba(167,139,250,0.3), transparent)",
                        }}
                    />
                    <div className="sp-card-header">
                        <div
                            className="sp-card-icon"
                            style={{
                                background: "rgba(167,139,250,0.1)",
                                color: "#a78bfa",
                            }}
                        >
                            <Clock size={15} />
                        </div>
                        <div className="sp-card-title">Payment History</div>
                    </div>
                    <div className="sp-card-body" style={{ padding: 0 }}>
                        {payments.length === 0 ? (
                            <div className="sp-empty">No payments yet</div>
                        ) : (
                            <>
                                {/* Desktop table */}
                                <table className="sp-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Plan</th>
                                            <th>Billing</th>
                                            <th className="right">Amount</th>
                                            <th className="right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedPayments.map((p) => {
                                            const pStyle = paymentStatusStyle(
                                                p.status,
                                            );
                                            const pc =
                                                PLAN_COLORS[
                                                    p.plan?.toLowerCase()
                                                ] || "#60a5fa";
                                            return (
                                                <tr key={p._id}>
                                                    <td>
                                                        {new Date(
                                                            p.paidAt,
                                                        ).toLocaleDateString(
                                                            "en-IN",
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className="sp-pill"
                                                            style={{
                                                                background: `${pc}12`,
                                                                borderColor: `${pc}30`,
                                                                color: pc,
                                                            }}
                                                        >
                                                            {p.plan}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className="sp-pill"
                                                            style={{
                                                                background:
                                                                    "rgba(148,163,184,0.1)",
                                                                borderColor:
                                                                    "rgba(148,163,184,0.2)",
                                                                color: "#94a3b8",
                                                            }}
                                                        >
                                                            {(
                                                                p.billingCycle ||
                                                                ""
                                                            ).toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="right">
                                                        <span className="sp-amount">
                                                            <IndianRupee
                                                                size={12}
                                                            />
                                                            {p.amountPaid}
                                                        </span>
                                                    </td>
                                                    <td className="right">
                                                        <span
                                                            className="sp-pill"
                                                            style={{
                                                                background:
                                                                    pStyle.bg,
                                                                borderColor:
                                                                    pStyle.border,
                                                                color: pStyle.color,
                                                            }}
                                                        >
                                                            {(
                                                                p.status ||
                                                                "success"
                                                            ).toLowerCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Mobile cards */}
                                <div
                                    className="sp-mob-table"
                                    style={{ padding: "12px 16px" }}
                                >
                                    {paginatedPayments.map((p) => {
                                        const pStyle = paymentStatusStyle(
                                            p.status,
                                        );
                                        const pc =
                                            PLAN_COLORS[
                                                p.plan?.toLowerCase()
                                            ] || "#60a5fa";
                                        return (
                                            <div
                                                key={p._id}
                                                className="sp-pay-card"
                                            >
                                                <div className="sp-pay-top">
                                                    <span
                                                        className="sp-pill"
                                                        style={{
                                                            background: `${pc}12`,
                                                            borderColor: `${pc}30`,
                                                            color: pc,
                                                        }}
                                                    >
                                                        {p.plan}
                                                    </span>
                                                    <span
                                                        className="sp-pill"
                                                        style={{
                                                            background:
                                                                pStyle.bg,
                                                            borderColor:
                                                                pStyle.border,
                                                            color: pStyle.color,
                                                        }}
                                                    >
                                                        {(
                                                            p.status ||
                                                            "success"
                                                        ).toLowerCase()}
                                                    </span>
                                                </div>
                                                <div className="sp-pay-bottom">
                                                    <div>
                                                        <div className="sp-pay-date">
                                                            {new Date(
                                                                p.paidAt,
                                                            ).toLocaleDateString(
                                                                "en-IN",
                                                            )}
                                                        </div>
                                                        <span
                                                            className="sp-pill"
                                                            style={{
                                                                marginTop: 6,
                                                                display:
                                                                    "inline-block",
                                                                background:
                                                                    "rgba(148,163,184,0.1)",
                                                                borderColor:
                                                                    "rgba(148,163,184,0.2)",
                                                                color: "#94a3b8",
                                                            }}
                                                        >
                                                            {(
                                                                p.billingCycle ||
                                                                ""
                                                            ).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="sp-pay-amount">
                                                        <IndianRupee
                                                            size={14}
                                                        />
                                                        {p.amountPaid}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="sp-pagination">
                        <button
                            className="sp-page-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => p - 1)}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {[...Array(totalPages)].map((_, i) => {
                            const pg = i + 1;
                            if (
                                pg === 1 ||
                                pg === totalPages ||
                                Math.abs(currentPage - pg) <= 1
                            ) {
                                return (
                                    <button
                                        key={i}
                                        className={`sp-page-btn ${currentPage === pg ? "active" : ""}`}
                                        onClick={() => setCurrentPage(pg)}
                                    >
                                        {pg}
                                    </button>
                                );
                            }
                            if (
                                pg === currentPage - 2 ||
                                pg === currentPage + 2
                            ) {
                                return (
                                    <span key={i} className="sp-page-dots">
                                        ···
                                    </span>
                                );
                            }
                            return null;
                        })}
                        <button
                            className="sp-page-btn"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => p + 1)}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* Pricing */}
                <div id="pricing">
                    <Pricing />
                </div>
            </div>
        </>
    );
}
