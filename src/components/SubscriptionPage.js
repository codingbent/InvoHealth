import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Pricing from "./Pricing";

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
                            {
                                headers: { "auth-token": token },
                            },
                        ),
                        fetch(`${API_BASE_URL}/api/admin/pricing`),
                    ]);

                const pricingData = await pricingRes.json();

                if (subscriptionRes.data.success) {
                    setData(subscriptionRes.data);
                }

                if (paymentRes.data.success) {
                    setPayments(paymentRes.data.payments);
                }

                if (pricingData.success) {
                    setPricing(pricingData.pricing);
                }
            } catch (err) {
                console.error("Subscription page error:", err);
            }
        }

        loadData();
    }, [API_BASE_URL]);

    const sortedPayments = useMemo(() => {
        return [...payments].sort(
            (a, b) => new Date(b.paidAt) - new Date(a.paidAt),
        );
    }, [payments]);

    if (!data || !pricing) {
        return <div className="text-center mt-5">Loading...</div>;
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
            : (pricing?.[planKey] ?? {
                  excelLimit: 0,
                  invoiceLimit: 0,
              });

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

    // const copyToClipboard = (text) => {
    //     if (navigator.clipboard) {
    //         navigator.clipboard.writeText(text);
    //     } else {
    //         const textarea = document.createElement("textarea");
    //         textarea.value = text;
    //         document.body.appendChild(textarea);
    //         textarea.select();
    //         document.execCommand("copy");
    //         document.body.removeChild(textarea);
    //     }

    //     props.showAlert("Payment ID copied!", "success");
    // };
    // ✅ ALWAYS at top (before return)

    const lastPayment = sortedPayments[0] || null;
    const lastPlan = lastPayment?.plan || subscription.plan;

    const totalPages = Math.ceil(sortedPayments.length / itemsPerPage);

    const paginatedPayments = sortedPayments.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    if (!data || !pricing) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    return (
        <div className="container py-4">
            <h3 className="fw-bold mb-4">Subscription</h3>

            {/* PLAN CARD */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 className="fw-bold mb-1 text-primary">
                                {isExpired && lastPayment
                                    ? `${lastPlan.toUpperCase()} Plan`
                                    : `${subscription.plan.toUpperCase()} Plan`}
                            </h4>

                            <span
                                className={`badge ${
                                    subscription.status === "active"
                                        ? "bg-success"
                                        : subscription.status === "expired"
                                          ? "bg-warning text-dark"
                                          : "bg-danger"
                                }`}
                            >
                                {subscription.status === "expired"
                                    ? "EXPIRED"
                                    : subscription.status.toUpperCase()}
                            </span>
                        </div>

                        <div className="text-end">
                            <div className="text-theme-secondary small">
                                Days Remaining
                            </div>

                            <h5 className="fw-bold text-theme-secondary">
                                {isExpired
                                    ? "0"
                                    : subscription.plan === "FREE"
                                      ? "Unlimited"
                                      : subscription.daysRemaining}
                            </h5>
                        </div>
                    </div>

                    <hr />

                    <div className="row">
                        <div className="col-md-6">
                            <p className="mb-2">
                                <strong>Start Date:</strong> {startDate}
                            </p>

                            <p className="mb-2">
                                <strong>Expiry Date:</strong> {expiryDate}
                            </p>
                        </div>

                        <div className="col-md-6">
                            <p className="mb-2">
                                <strong>Billing Cycle:</strong>{" "}
                                {(billingCycle || "").toUpperCase()}
                            </p>

                            <p className="mb-2">
                                <strong>Currency:</strong>{" "}
                                {subscription.currency}
                            </p>
                        </div>
                    </div>

                    {/* EXPIRED ALERT */}
                    {isExpired && (
                        <div className="alert alert-warning mt-3">
                            Your <strong>{lastPlan.toUpperCase()}</strong> plan
                            has expired.
                            <a href="#pricing">
                                <span className="ms-2">Upgrade</span>
                            </a>{" "}
                            to continue using features.
                        </div>
                    )}
                </div>
            </div>

            {/* USAGE CARD */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <h5 className="fw-bold mb-3">Current Plan Usage</h5>

                    <div className="mb-3">
                        <div className="d-flex justify-content-between">
                            <span>Excel Exports</span>
                            <span>
                                {safeUsage.excelExports} /{" "}
                                {excelLimit === -1 ? "∞" : excelLimit}
                            </span>
                        </div>

                        <div className="progress">
                            <div
                                className="progress-bar"
                                style={{ width: `${excelPercent}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="d-flex justify-content-between">
                            <span>Invoice Downloads</span>
                            <span>
                                {safeUsage.invoiceDownloads} /{" "}
                                {invoiceLimit === -1 ? "∞" : invoiceLimit}
                            </span>
                        </div>

                        <div className="progress">
                            <div
                                className="progress-bar bg-success"
                                style={{ width: `${invoicePercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT HISTORY */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <h5 className="fw-bold mb-3">Payment History</h5>

                    <div className="table-responsive d-none d-md-block">
                        <table className="table table-dark table-hover align-middle">
                            <thead className="border-bottom border-secondary">
                                <tr>
                                    <th>Date</th>
                                    <th>Plan</th>
                                    <th>Billing</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {payments.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="text-center py-4 text-theme-secondary"
                                        >
                                            No payments yet
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedPayments.map((p) => (
                                        <tr key={p._id}>
                                            <td>
                                                {new Date(
                                                    p.paidAt,
                                                ).toLocaleDateString("en-IN")}
                                            </td>

                                            <td>
                                                <span className="badge bg-primary text-uppercase">
                                                    {p.plan}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="badge bg-secondary">
                                                    {(
                                                        p.billingCycle || ""
                                                    ).toUpperCase()}
                                                </span>
                                            </td>

                                            <td className="fw-semibold text-success">
                                                ₹{p.amountPaid}
                                            </td>

                                            <td>
                                                {(() => {
                                                    const status = (
                                                        p.status || "success"
                                                    ).toLowerCase();

                                                    const badgeClass =
                                                        status === "success"
                                                            ? "bg-success"
                                                            : status ===
                                                                "failed"
                                                              ? "bg-danger"
                                                              : status ===
                                                                  "pending"
                                                                ? "bg-warning text-dark"
                                                                : "bg-secondary";

                                                    return (
                                                        <span
                                                            className={`badge ${badgeClass} text-uppercase`}
                                                        >
                                                            {status}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE */}
                    <div className="d-md-none">
                        {payments.length === 0 ? (
                            <div className="text-center text-theme-secondary py-3">
                                No payments yet
                            </div>
                        ) : (
                            paginatedPayments.map((p) => (
                                <div
                                    key={p._id}
                                    className="card mb-3 p-3 border-0 shadow-sm"
                                    style={{ background: "#0f172a" }}
                                >
                                    <div className="d-flex justify-content-between mb-2">
                                        <span className="badge bg-primary">
                                            {p.plan}
                                        </span>
                                        <span className="badge bg-secondary">
                                            {(
                                                p.billingCycle || ""
                                            ).toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="text-theme-secondary small">
                                        {new Date(p.paidAt).toLocaleDateString(
                                            "en-IN",
                                        )}
                                    </div>

                                    <div className="fw-bold text-success mt-1">
                                        ₹{p.amountPaid}
                                    </div>

                                    <div className="mt-2">
                                        {(() => {
                                            const status = (
                                                p.status || "success"
                                            ).toLowerCase();

                                            const badgeClass =
                                                status === "success"
                                                    ? "bg-success"
                                                    : status === "failed"
                                                      ? "bg-danger"
                                                      : status === "pending"
                                                        ? "bg-warning text-dark"
                                                        : "bg-secondary";

                                            return (
                                                <span
                                                    className={`badge ${badgeClass}`}
                                                >
                                                    {status}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {totalPages > 1 && (
                <div className="pagination-container">
                    <button
                        className="page-btn nav-btn"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                    >
                        ←
                    </button>

                    {[...Array(totalPages)].map((_, i) => {
                        const page = i + 1;

                        if (
                            page === 1 ||
                            page === totalPages ||
                            Math.abs(currentPage - page) <= 1
                        ) {
                            return (
                                <button
                                    key={i}
                                    className={`page-btn ${
                                        currentPage === page ? "active" : ""
                                    }`}
                                    onClick={() => setCurrentPage(page)}
                                >
                                    {page}
                                </button>
                            );
                        }

                        if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                        ) {
                            return (
                                <span key={i} className="dots">
                                    ...
                                </span>
                            );
                        }

                        return null;
                    })}

                    <button
                        className="page-btn nav-btn"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                    >
                        →
                    </button>
                </div>
            )}
            <div id="pricing">
                <Pricing />
            </div>
        </div>
    );
}
