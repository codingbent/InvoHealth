import { useState, useEffect } from "react";
import { authFetch } from "./authfetch";
import { Link } from "react-router-dom";
import { IndianRupee, Check, X, AlertTriangle, Zap } from "lucide-react";

export default function Pricing() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const [billingCycle, setBillingCycle] = useState(null);
    const [billing, setBilling] = useState("monthly");
    const [plan, setPlan] = useState(null);
    const [prices, setPrices] = useState(null);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const planOrder = { FREE: 0, STARTER: 1, PRO: 2, ENTERPRISE: 3 };

    useEffect(() => {
        if (!token) {
            setPlan("FREE");
            return;
        }
        const fetchSubscription = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/subscription`,
                );
                const data = await res.json();
                if (data.success) {
                    setPlan(data.subscription.plan.toUpperCase());
                    setBillingCycle(data.subscription.billingCycle);
                } else {
                    setPlan("FREE");
                }
            } catch (err) {
                console.error(err);
                setPlan("FREE");
            }
        };
        fetchSubscription();
    }, [API_BASE_URL, token]);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/pricing`);
                const data = await res.json();
                if (data.success) setPrices(data.pricing);
            } catch (err) {
                console.error("Pricing fetch error", err);
            }
        };
        fetchPricing();
    }, [API_BASE_URL]);

    const savings = (planKey) => {
        if (!prices || !prices[planKey]) return 0;
        const monthly = prices[planKey].monthly;
        const yearly = Math.round(monthly * 12 * (1 - prices.discount / 100));
        return monthly * 12 - yearly;
    };

    const handleUpgrade = async (selectedPlan) => {
        if (!token) return;
        const res = await authFetch(
            `${API_BASE_URL}/api/payment/create-order`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: selectedPlan, billing }),
            },
        );
        if (!res.ok) {
            console.error("Order API failed");
            return;
        }
        const data = await res.json();
        const options = {
            key: process.env.Razor_Pay_Key_ID,
            amount: data.order.amount,
            currency: "INR",
            order_id: data.order.id,
            handler: async function (response) {
                const verifyRes = await authFetch(
                    `${API_BASE_URL}/api/payment/verify-payment`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            ...response,
                            plan: selectedPlan,
                            billing,
                        }),
                    },
                );
                const verifyData = await verifyRes.json();
                if (verifyData.success) window.location.reload();
                else alert("Payment verification failed");
            },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    if (!prices || !plan) {
        return (
            <div className="pr-loading">
                <span className="pr-dot" />
                <span className="pr-dot" />
                <span className="pr-dot" />
            </div>
        );
    }

    const renderLimits = (planKey) => {
        const p = prices[planKey];
        const excelLimit =
            p.excelLimit === -1
                ? "Unlimited"
                : billing === "monthly"
                  ? p.excelLimit
                  : p.excelLimit * 12;
        const invoiceLimit =
            p.invoiceLimit === -1
                ? "Unlimited"
                : billing === "monthly"
                  ? p.invoiceLimit
                  : p.invoiceLimit * 12;

        const imageLimit =
            p.imageLimit === -1
                ? "Unlimited"
                : billing === "monthly"
                  ? p.imageLimit
                  : p.imageLimit * 12;

        const features = [
            { label: "Unlimited Patients", ok: true },
            {
                label:
                    p.staffLimit === -1
                        ? "Unlimited Staff"
                        : `${p.staffLimit} Staff Accounts`,
                ok: p.staffLimit === -1,
                warn: p.staffLimit !== -1,
            },
            { label: "Appointments", ok: true },
            { label: "Billing", ok: true },
            { label: "Analytics Dashboard", ok: p.analytics },
            { label: "Revenue Insights", ok: p.analytics },
            { label: "Payment Analytics", ok: p.analytics },
            {
                label:
                    p.excelLimit === -1
                        ? "Unlimited Excel Downloads"
                        : `${excelLimit} Excel Downloads ${billing === "monthly" ? "/ month" : "/ yr"}`,
                ok: p.excelLimit === -1,
                warn: p.excelLimit !== -1,
            },
            {
                label:
                    p.invoiceLimit === -1
                        ? "Unlimited Invoice Downloads"
                        : `${invoiceLimit} Invoice Downloads ${billing === "monthly" ? "/ month" : "/ yr"}`,
                ok: p.invoiceLimit === -1,
                warn: p.invoiceLimit !== -1,
            },
            {
                label:
                    p.imageLimit === -1
                        ? "Unlimited Image Uploads"
                        : `${imageLimit} Image Uploads ${billing === "monthly" ? "/ month" : "/ yr"}`,
                ok: p.imageLimit === -1,
                warn: p.imageLimit !== -1,
            },
        ];

        return features.map((f, i) => (
            <li
                key={i}
                className={`pr-feature ${f.ok ? "ok" : f.warn ? "warn" : "off"}`}
            >
                <span className="pr-feature-icon">
                    {f.ok ? (
                        <Check size={12} />
                    ) : f.warn ? (
                        <AlertTriangle size={12} />
                    ) : (
                        <X size={12} />
                    )}
                </span>
                {f.label}
            </li>
        ));
    };

    const PLAN_META = {
        starter: { accent: "#60a5fa", glow: "rgba(96,165,250,0.08)" },
        pro: {
            accent: "#a78bfa",
            glow: "rgba(167,139,250,0.1)",
            badge: "Most Popular",
        },
        enterprise: { accent: "#fb923c", glow: "rgba(251,146,60,0.08)" },
    };

    return (
        <>
            <div className="pr-root">
                <div className="pr-inner">
                    {/* Header */}
                    <div className="pr-header">
                        <div className="pr-eyebrow"></div>
                        <h1 className="pr-title">
                            Simple, <em>transparent</em> pricing
                        </h1>
                        <div className="pr-subtitle">
                            Choose the best plan for your clinic
                        </div>

                        {!token && (
                            <div className="pr-trial-note">
                                <span>30-day free trial</span>
                                <span className="pr-trial-dot" />
                                <span>No credit card required</span>
                                <span className="pr-trial-dot" />
                                <span>
                                    Cancel before trial ends to avoid charges
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Billing toggle */}
                    <div className="pr-toggle-wrap">
                        <div className="pr-toggle">
                            <button
                                className={`pr-toggle-btn ${billing === "monthly" ? "active" : ""}`}
                                onClick={() => setBilling("monthly")}
                            >
                                Monthly
                            </button>
                            <button
                                className={`pr-toggle-btn ${billing === "yearly" ? "active" : ""}`}
                                onClick={() => setBilling("yearly")}
                            >
                                Yearly
                                <span className="pr-save-badge">Save ~17%</span>
                            </button>
                        </div>
                    </div>

                    {/* Current plan banner */}
                    {token && role === "doctor" && (
                        <div className="pr-current-banner">
                            <div>
                                <div className="pr-current-left">
                                    Your current plan
                                </div>
                                <div className="pr-current-badge">
                                    {plan.charAt(0) +
                                        plan.slice(1).toLowerCase()}{" "}
                                    <em>plan</em>
                                </div>
                            </div>
                            <div className="pr-trust">
                                <span className="pr-trust-item">
                                    <Check size={10} /> Cancel anytime
                                </span>
                                <span className="pr-trust-item">
                                    <Check size={10} /> Secure payments
                                </span>
                                <span className="pr-trust-item">
                                    <Check size={10} /> No hidden charges
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Cards */}
                    <div className="pr-grid">
                        {["starter", "pro", "enterprise"].map((p) => {
                            const planUpper = p.toUpperCase();
                            const meta = PLAN_META[p];
                            const isFeatured = p === "pro";
                            const yearlyPrice = Math.round(
                                prices[p].monthly *
                                    12 *
                                    (1 - prices.discount / 100),
                            );

                            return (
                                <div
                                    key={p}
                                    className={`pr-card ${isFeatured ? "featured" : ""}`}
                                    style={{
                                        "--accent": meta.accent,
                                        borderColor: isFeatured
                                            ? `rgba(167,139,250,0.3)`
                                            : undefined,
                                    }}
                                >
                                    {/* top accent line */}
                                    <style>{`.pr-card:nth-child(${["starter", "pro", "enterprise"].indexOf(p) + 1})::before { background: linear-gradient(90deg, transparent, ${meta.accent}66, transparent); }`}</style>

                                    {meta.badge && (
                                        <span className="pr-popular-badge">
                                            {meta.badge}
                                        </span>
                                    )}

                                    <div className="pr-plan-name">{p}</div>

                                    <div className="pr-price">
                                        <span className="pr-price-symbol">
                                            <IndianRupee size={16} />
                                        </span>
                                        <span
                                            className="pr-price-amount"
                                            style={{ color: meta.accent }}
                                        >
                                            {billing === "monthly"
                                                ? prices[p].monthly
                                                : yearlyPrice}
                                        </span>
                                        <span className="pr-price-period">
                                            /
                                            {billing === "monthly"
                                                ? "month"
                                                : "year"}
                                        </span>
                                    </div>

                                    {billing === "yearly" && (
                                        <>
                                            <div className="pr-original">
                                                <IndianRupee size={12} />
                                                {prices[p].monthly * 12}
                                            </div>
                                            <div className="pr-savings">
                                                ↓ Save{" "}
                                                <IndianRupee
                                                    size={11}
                                                    style={{
                                                        display: "inline",
                                                    }}
                                                />
                                                {savings(p)} per year
                                            </div>
                                        </>
                                    )}

                                    <div className="pr-card-divider" />

                                    <ul className="pr-features">
                                        {renderLimits(p)}
                                    </ul>

                                    {/* CTA */}
                                    {!token ? (
                                        <Link
                                            to={`/signup?plan=${p}&billing=${billing}`}
                                            className="pr-btn pr-btn-primary"
                                        >
                                            <Zap size={13} /> Start Free Trial
                                        </Link>
                                    ) : plan === planUpper &&
                                      billingCycle === billing ? (
                                        <button
                                            className="pr-btn pr-btn-disabled"
                                            disabled
                                        >
                                            Current Plan
                                        </button>
                                    ) : planOrder[plan] >
                                      planOrder[planUpper] ? (
                                        <button className="pr-btn pr-btn-outline">
                                            Downgrade
                                        </button>
                                    ) : (
                                        <button
                                            className="pr-btn pr-btn-primary"
                                            style={{
                                                background: meta.accent,
                                                boxShadow: `0 4px 16px ${meta.glow}`,
                                            }}
                                            onClick={() => handleUpgrade(p)}
                                        >
                                            Upgrade to{" "}
                                            {p.charAt(0).toUpperCase() +
                                                p.slice(1)}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>;
