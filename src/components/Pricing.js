import { useState, useEffect, useRef, useCallback } from "react";
import { authFetch, SubscriptionError } from "./authfetch";
import { Link, useNavigate } from "react-router-dom";
import {
    Check,
    X,
    AlertTriangle,
    Zap,
    Globe,
    ChevronDown,
    Lock,
} from "lucide-react";
import { API_BASE_URL } from "../components/config";
import CountrySelect from "../hooks/CountrySelect";
import "../css/Pricing.css";

const planOrder = { STARTER: 1, PRO: 2, ENTERPRISE: 3 };

const PLAN_META = {
    starter: {
        accent: "#60a5fa",
        glow: "rgba(96,165,250,0.18)",
        label: "Starter",
    },
    pro: {
        accent: "#a78bfa",
        glow: "rgba(167,139,250,0.18)",
        label: "Pro",
        badge: "Most Popular",
    },
    enterprise: {
        accent: "#fb923c",
        glow: "rgba(251,146,60,0.18)",
        label: "Enterprise",
    },
};

export default function Pricing() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // ── subscription state ──
    const [billingCycle, setBillingCycle] = useState(null);
    const [billing, setBilling] = useState("monthly");
    const [plan, setPlan] = useState(null);
    const [status, setStatus] = useState("none");
    const [expiryDate, setExpiryDate] = useState(null); // eslint-disable-line

    // ── pricing / country state ──
    const [prices, setPrices] = useState(null);
    const [country, setCountry] = useState(null);
    const [countries, setCountries] = useState([]);
    const [showCountryHint, setShowCountryHint] = useState(false);

    // ── modal state ──
    const [intlPayModal, setIntlPayModal] = useState(null);
    const [paypalLoading, setPaypalLoading] = useState(false);
    const [paypalError, setPaypalError] = useState(null);
    const [processingPlan, setProcessingPlan] = useState(null);

    // ── ref guard: prevents double approval ──
    const approvalInProgress = useRef(false);

    // ─────────────────────────────────────────────────────────────────────────
    // Derived helpers
    // ─────────────────────────────────────────────────────────────────────────
    const getSelectedCountry = useCallback(
        () => countries.find((c) => c.code === country),
        [countries, country],
    );
    const sel = getSelectedCountry();
    const isIndia = sel?.currency === "INR";
    const isCurrencyReady = prices && countries.length > 0 && sel;

    const getFinalPrice = useCallback(
        (planKey, billingType) => {
            if (!prices || !countries.length) return 0;
            const s = getSelectedCountry();
            if (!s) return 0;
            const adjustedINR = prices[planKey].monthly * (s.multiplier || 1);
            if (billingType === "monthly") return adjustedINR / (s.rate || 1);
            return (
                (adjustedINR * 12 * (1 - prices.discount / 100)) / (s.rate || 1)
            );
        },
        [prices, countries, getSelectedCountry],
    );

    const savings = useCallback(
        (planKey) => {
            if (!prices) return 0;
            const s = getSelectedCountry();
            if (!s) return 0;
            const monthly = getFinalPrice(planKey, "monthly");
            const yearly = getFinalPrice(planKey, "yearly");
            return Math.round(monthly * 12 - yearly);
        },
        [prices, getSelectedCountry, getFinalPrice],
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Country hint for guests
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (token) return;
        const t = setTimeout(() => setShowCountryHint(true), 800);
        return () => clearTimeout(t);
    }, [token]);

    // ─────────────────────────────────────────────────────────────────────────
    // Fetch subscription
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token) {
            localStorage.clear();
            navigate("/");
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
                    const sub = data.subscription;
                    setPlan(sub.plan.toUpperCase());
                    setBillingCycle(sub.billingCycle);
                    setExpiryDate(sub.expiryDate);
                    if (sub.currency) {
                        const matched = countries.find(
                            (c) => c.currency === sub.currency,
                        );
                        if (matched) setCountry(matched.code);
                    }
                    let computedStatus = sub.status;
                    if (sub.expiryDate) {
                        const today = new Date();
                        const exp = new Date(sub.expiryDate);
                        today.setHours(0, 0, 0, 0);
                        exp.setHours(0, 0, 0, 0);
                        if (
                            (computedStatus === "trial" ||
                                computedStatus === "active") &&
                            exp <= today
                        )
                            computedStatus = "expired";
                    }
                    setStatus(computedStatus);
                } else {
                    setPlan("FREE");
                }
            } catch (err) {
                // SubscriptionError is caught here — treat as free
                console.error(err);
                setPlan("FREE");
            }
        };
        fetchSubscription();
    }, [token, countries, navigate]);

    // ─────────────────────────────────────────────────────────────────────────
    // Fetch pricing & countries
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        authFetch(`${API_BASE_URL}/api/admin/pricing`)
            .then((r) => r.json())
            .then((d) => {
                if (d.success) setPrices(d.pricing);
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        authFetch(`${API_BASE_URL}/api/admin/country`)
            .then((r) => r.json())
            .then((d) => {
                if (d.success)
                    setCountries(
                        (d.countries || []).filter((c) => c.active === true),
                    );
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (countries.length && !country) setCountry(countries[0].code);
    }, [countries, country]);

    // ─────────────────────────────────────────────────────────────────────────
    // Warn user before leaving page mid-payment
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!intlPayModal) return;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue =
                "Payment in progress. Are you sure you want to leave?";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [intlPayModal]);

    // ─────────────────────────────────────────────────────────────────────────
    // PayPal button — ORDER FLOW (replaces subscription flow)
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!intlPayModal?.plan) return;

        setPaypalLoading(true);
        setPaypalError(null);
        approvalInProgress.current = false;

        const timer = setTimeout(() => {
            const renderPaypal = () => {
                const container = document.getElementById(
                    "paypal-button-container",
                );
                if (container) container.innerHTML = "";

                if (!window.paypal) {
                    setPaypalError(
                        "PayPal SDK failed to load. Please refresh and try again.",
                    );
                    setPaypalLoading(false);
                    return;
                }

                window.paypal
                    .Buttons({
                        style: {
                            layout: "vertical",
                            color: "gold",
                            shape: "rect",
                            label: "pay",
                        },

                        // Step 1: Backend creates the order with correct price + currency
                        createOrder: async () => {
                            try {
                                const res = await authFetch(
                                    `${API_BASE_URL}/api/payment/create-paypal-order`,
                                    {
                                        method: "POST",
                                        body: JSON.stringify({
                                            plan: intlPayModal.plan,
                                            billing: intlPayModal.billing,
                                            currency: intlPayModal.currency,
                                        }),
                                    },
                                );
                                const data = await res.json();
                                if (!data.success)
                                    throw new Error(
                                        data.error || "Failed to create order",
                                    );
                                return data.orderID;
                            } catch (err) {
                                if (err instanceof SubscriptionError) {
                                    setPaypalError(
                                        "Subscription error. Please refresh and try again.",
                                    );
                                } else {
                                    setPaypalError(
                                        err.message ||
                                            "Failed to create order. Please try again.",
                                    );
                                }
                                // Return null so PayPal button shows error state
                                throw err;
                            }
                        },

                        // Step 2: User approved — backend captures + activates
                        onApprove: async (data) => {
                            if (approvalInProgress.current) return;
                            approvalInProgress.current = true;

                            setPaypalLoading(true);
                            setPaypalError(null);

                            try {
                                const res = await authFetch(
                                    `${API_BASE_URL}/api/payment/paypal-capture-order`,
                                    {
                                        method: "POST",
                                        body: JSON.stringify({
                                            orderID: data.orderID,
                                            plan: intlPayModal.plan,
                                            billing: intlPayModal.billing,
                                            currency: intlPayModal.currency,
                                        }),
                                    },
                                );

                                const result = await res.json();

                                if (!result.success)
                                    throw new Error(
                                        result.error || "Capture failed",
                                    );

                                closeModal();
                                window.location.reload();
                            } catch (err) {
                                console.error("PayPal onApprove error:", err);
                                setPaypalError(
                                    err instanceof SubscriptionError
                                        ? err.message
                                        : "Payment received but verification failed. Contact support with Order ID: " +
                                              data.orderID,
                                );
                                setPaypalLoading(false);
                                approvalInProgress.current = false;
                            }
                        },

                        onInit: () => setPaypalLoading(false),

                        onError: (err) => {
                            console.error("PayPal SDK error:", err);
                            setPaypalError(
                                "Payment failed. Please try again or contact support.",
                            );
                            setPaypalLoading(false);
                            approvalInProgress.current = false;
                        },

                        onCancel: () => {
                            setPaypalLoading(false);
                            approvalInProgress.current = false;
                        },
                    })
                    .render("#paypal-button-container")
                    .catch((err) => {
                        console.error("PayPal render error:", err);
                        setPaypalError(
                            "Failed to load PayPal button. Please refresh and try again.",
                        );
                        setPaypalLoading(false);
                    });
            };

            // Load PayPal SDK once — Orders API (no vault, no subscription intent)
            const existingScript = document.getElementById("paypal-sdk-script");
            if (existingScript) {
                renderPaypal();
            } else {
                const script = document.createElement("script");
                script.id = "paypal-sdk-script";
                // intent=capture for order flow — NO vault=true, NO intent=subscription
                script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}&intent=capture&currency=${intlPayModal.currency}`;
                script.async = true;
                script.onload = renderPaypal;
                script.onerror = () => {
                    setPaypalError(
                        "Failed to load PayPal. Check your internet connection.",
                    );
                    setPaypalLoading(false);
                };
                document.body.appendChild(script);
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            const container = document.getElementById(
                "paypal-button-container",
            );
            if (container) container.innerHTML = "";
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intlPayModal]);

    // ─────────────────────────────────────────────────────────────────────────
    // Close modal
    // ─────────────────────────────────────────────────────────────────────────
    const closeModal = () => {
        setIntlPayModal(null);
        setPaypalLoading(false);
        setPaypalError(null);
        approvalInProgress.current = false;
        const container = document.getElementById("paypal-button-container");
        if (container) container.innerHTML = "";
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Handle plan button click
    // ─────────────────────────────────────────────────────────────────────────
    const handlePlanChange = async (planKey) => {
        if (!token || processingPlan) return;

        if (
            !window.confirm(
                "You will be charged immediately and plan will change now. Continue?",
            )
        )
            return;

        setProcessingPlan(planKey);

        try {
            // ── INDIA → RAZORPAY ──
            if (isIndia) {
                const loadRazorpay = () =>
                    new Promise((resolve) => {
                        if (window.Razorpay) return resolve(true);
                        const s = document.createElement("script");
                        s.src = "https://checkout.razorpay.com/v1/checkout.js";
                        s.onload = () => resolve(true);
                        s.onerror = () => resolve(false);
                        document.body.appendChild(s);
                    });

                const loaded = await loadRazorpay();
                if (!loaded || !window.Razorpay) {
                    alert(
                        "Razorpay SDK failed to load. Please refresh and try again.",
                    );
                    return;
                }

                const res = await authFetch(
                    `${API_BASE_URL}/api/payment/create-subscription`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            plan: planKey,
                            billing,
                            currency: "INR",
                        }),
                    },
                );
                const data = await res.json();

                if (!data.success) {
                    alert(data.error || "Something went wrong");
                    return;
                }

                const rzp = new window.Razorpay({
                    key: process.env.REACT_APP_RAZORPAY_KEY_ID,
                    subscription_id: data.subscription.id,
                    name: "InvoHealth",
                    handler: async (response) => {
                        try {
                            const verifyRes = await authFetch(
                                `${API_BASE_URL}/api/payment/verify-payment`,
                                {
                                    method: "POST",
                                    body: JSON.stringify({
                                        razorpay_payment_id:
                                            response.razorpay_payment_id,
                                        razorpay_subscription_id:
                                            response.razorpay_subscription_id,
                                        razorpay_signature:
                                            response.razorpay_signature,
                                        plan: planKey,
                                        currency: "INR",
                                    }),
                                },
                            );
                            const verifyData = await verifyRes.json();
                            if (!verifyData.success)
                                throw new Error(verifyData.error);
                            window.location.reload();
                        } catch (err) {
                            alert(
                                "Payment received but verification failed. Contact support with Payment ID: " +
                                    response.razorpay_payment_id,
                            );
                        }
                    },
                    modal: {
                        ondismiss: () => setProcessingPlan(null),
                    },
                });

                rzp.open();
                return;
            }

            // ── INTERNATIONAL → PAYPAL ORDER ──
            const amount =
                billing === "monthly"
                    ? getFinalPrice(planKey, "monthly")
                    : getFinalPrice(planKey, "yearly");

            setIntlPayModal({
                plan: planKey,
                billing,
                symbol: sel?.symbol,
                currency: sel?.currency,
                amount: amount.toFixed(0),
            });
        } catch (err) {
            if (err instanceof SubscriptionError) {
                alert(err.message);
            } else {
                alert(err.message || "Something went wrong");
            }
        } finally {
            setProcessingPlan(null);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Loading gate
    // ─────────────────────────────────────────────────────────────────────────
    if (!prices || !plan || !countries.length || !country || !sel) {
        return (
            <div className="pr-loading">
                <span className="pr-dot" />
                <span className="pr-dot" />
                <span className="pr-dot" />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────────────────────────────────────
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
                        : `${excelLimit} Excel Downloads ${billing === "monthly" ? "/ mo" : "/ yr"}`,
                ok: p.excelLimit === -1,
                warn: p.excelLimit !== -1,
            },
            {
                label:
                    p.invoiceLimit === -1
                        ? "Unlimited Invoice Downloads"
                        : `${invoiceLimit} Invoice Downloads ${billing === "monthly" ? "/ mo" : "/ yr"}`,
                ok: p.invoiceLimit === -1,
                warn: p.invoiceLimit !== -1,
            },
            {
                label:
                    p.imageLimit === -1
                        ? "Unlimited Image Uploads"
                        : `${imageLimit} Image Uploads ${billing === "monthly" ? "/ mo" : "/ yr"}`,
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
                        <Check size={11} />
                    ) : f.warn ? (
                        <AlertTriangle size={11} />
                    ) : (
                        <X size={11} />
                    )}
                </span>
                {f.label}
            </li>
        ));
    };

    // ─────────────────────────────────────────────────────────────────────────
    // JSX
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="pr-root">
            <div className="pr-inner">
                {/* ── Top bar ── */}
                <div className="pr-topbar">
                    <div className="pr-topbar-left">
                        <h1 className="pr-title">
                            Simple, <em>transparent</em> pricing
                        </h1>
                        <div className="pr-subtitle">
                            Choose the best plan for your Medical Center
                        </div>
                    </div>
                    <div className="pr-topbar-right">
                        {role !== "doctor" && (
                            <div className="pr-country-pill-wrap">
                                <div className="pr-country-pill">
                                    <Globe
                                        size={13}
                                        className="pr-globe-icon"
                                    />
                                    <CountrySelect
                                        value={country}
                                        onChange={setCountry}
                                    />
                                    <ChevronDown
                                        size={12}
                                        className="pr-chevron-icon"
                                    />
                                </div>
                                {!token && showCountryHint && (
                                    <div className="pr-country-tooltip">
                                        <div className="pr-tooltip-content">
                                            Select your country to see correct
                                            pricing & payment methods
                                        </div>
                                        <button
                                            className="pr-tooltip-close"
                                            onClick={() =>
                                                setShowCountryHint(false)
                                            }
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Billing toggle ── */}
                <div className="pr-controls-row">
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
                            Yearly{" "}
                            <span className="pr-save-badge">
                                Save ~{Math.ceil(prices.discount)}%
                            </span>
                        </button>
                    </div>
                </div>

                {role !== "doctor" && (
                    <div
                        style={{
                            padding: "12px 48px 0",
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        <div className="lp-trial-banner">
                            <div className="lp-trial-left">
                                <span className="lp-trial-badge">
                                    ✦ Free Trial
                                </span>
                                <span className="lp-trial-text">
                                    <strong>No credit card required.</strong>{" "}
                                    Get full access for 30 days — upgrade when
                                    you're ready.
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Current plan banner ── */}
                {token && role === "doctor" && (
                    <div className="pr-current-banner">
                        <div className="pr-current-left">
                            <span className="pr-current-eyebrow">
                                Current plan
                            </span>
                            <span className="pr-current-badge">
                                {plan.charAt(0) + plan.slice(1).toLowerCase()}{" "}
                                <em>plan</em>
                            </span>
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

                {/* ── Cards ── */}
                <div className="pr-grid">
                    {["starter", "pro", "enterprise"].map((p) => {
                        const symbol = sel?.symbol || "";
                        const finalMonthly = getFinalPrice(p, "monthly");
                        const finalYearly = getFinalPrice(p, "yearly");
                        const planUpper = p.toUpperCase();
                        const meta = PLAN_META[p];
                        const isFeatured = p === "pro";
                        const isProcessing = processingPlan === p;

                        return (
                            <div
                                key={p}
                                className={`pr-card ${isFeatured ? "featured" : ""}`}
                                style={{
                                    "--accent": meta.accent,
                                    "--glow": meta.glow,
                                }}
                            >
                                <div
                                    className="pr-card-topline"
                                    style={{
                                        background: `linear-gradient(90deg,transparent,${meta.accent}66,transparent)`,
                                    }}
                                />

                                <div className="pr-card-header">
                                    <div
                                        className="pr-plan-dot"
                                        style={{ background: meta.accent }}
                                    />
                                    <div
                                        className="pr-plan-name"
                                        style={{ color: meta.accent }}
                                    >
                                        {meta.label}
                                    </div>
                                    {meta.badge && (
                                        <span className="pr-popular-badge">
                                            {meta.badge}
                                        </span>
                                    )}
                                </div>

                                <div className="pr-price-block">
                                    <div className="pr-price">
                                        <span className="pr-currency">
                                            {!isCurrencyReady ? "" : symbol}
                                        </span>
                                        <span className="pr-amount">
                                            {!isCurrencyReady
                                                ? "..."
                                                : billing === "monthly"
                                                  ? finalMonthly.toFixed(0)
                                                  : finalYearly.toFixed(0)}
                                        </span>
                                        <span className="pr-period">
                                            /
                                            {billing === "monthly"
                                                ? "mo"
                                                : "yr"}
                                        </span>
                                    </div>
                                    {billing === "yearly" && (
                                        <div className="pr-yearly-meta">
                                            <span className="pr-original">
                                                {symbol}
                                                {(finalMonthly * 12).toFixed(0)}
                                            </span>
                                            <span className="pr-savings">
                                                Save {symbol}
                                                {savings(p)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pr-charge-currency">
                                        {isIndia
                                            ? "Pay in INR via Razorpay"
                                            : `Pay in ${sel?.currency} via PayPal`}
                                    </div>
                                </div>

                                <div className="pr-card-divider" />
                                <ul className="pr-features">
                                    {renderLimits(p)}
                                </ul>

                                {!token ? (
                                    <Link
                                        to={`/signup?plan=${p}&billing=${billing}`}
                                        className="pr-btn pr-btn-primary"
                                        style={{
                                            background: meta.accent,
                                            boxShadow: `0 4px 20px ${meta.glow}`,
                                        }}
                                    >
                                        <Zap size={13} /> Start Free Trial
                                    </Link>
                                ) : (
                                    (() => {
                                        const isSamePlan = plan === planUpper;
                                        const isSameBilling =
                                            billingCycle === billing;
                                        const isExpired = status !== "active";

                                        const btnStyle = {
                                            background: meta.accent,
                                            boxShadow: `0 4px 20px ${meta.glow}`,
                                        };
                                        const btnClick = () =>
                                            handlePlanChange(p);
                                        const disabled =
                                            isProcessing || !!processingPlan;

                                        if (isExpired)
                                            return (
                                                <button
                                                    className="pr-btn pr-btn-primary"
                                                    style={btnStyle}
                                                    onClick={btnClick}
                                                    disabled={disabled}
                                                >
                                                    {isProcessing
                                                        ? "Processing…"
                                                        : `Renew ${meta.label}`}
                                                </button>
                                            );

                                        if (isSamePlan && isSameBilling)
                                            return (
                                                <button
                                                    className="pr-btn pr-btn-current"
                                                    disabled
                                                >
                                                    <Check size={13} /> Current
                                                    Plan
                                                </button>
                                            );

                                        if (isSamePlan && !isSameBilling)
                                            return (
                                                <button
                                                    className="pr-btn pr-btn-outline"
                                                    onClick={btnClick}
                                                    disabled={disabled}
                                                >
                                                    {isProcessing
                                                        ? "Processing…"
                                                        : `Switch to ${billing === "monthly" ? "Monthly" : "Yearly"}`}
                                                </button>
                                            );

                                        if (
                                            plan &&
                                            planOrder[plan] >
                                                planOrder[planUpper]
                                        )
                                            return (
                                                <button
                                                    className="pr-btn pr-btn-outline"
                                                    onClick={btnClick}
                                                    disabled={disabled}
                                                >
                                                    {isProcessing
                                                        ? "Processing…"
                                                        : "Downgrade"}
                                                </button>
                                            );

                                        return (
                                            <button
                                                className="pr-btn pr-btn-primary"
                                                style={btnStyle}
                                                onClick={btnClick}
                                                disabled={disabled}
                                            >
                                                {isProcessing
                                                    ? "Processing…"
                                                    : `Upgrade to ${meta.label}`}
                                            </button>
                                        );
                                    })()
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ── International PayPal modal ── */}
                {intlPayModal && (
                    <div className="pr-modal-bg" onClick={closeModal}>
                        <div
                            className="pr-intl-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="pr-intl-modal-header">
                                <div className="pr-intl-modal-title">
                                    Complete <em>Payment</em>
                                </div>
                                <button
                                    className="pr-intl-close"
                                    onClick={closeModal}
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="pr-intl-summary">
                                <span className="pr-intl-plan">
                                    {PLAN_META[intlPayModal.plan]?.label} ·{" "}
                                    {intlPayModal.billing}
                                </span>
                                <span className="pr-intl-amount">
                                    {intlPayModal.symbol}
                                    {intlPayModal.amount}{" "}
                                    {intlPayModal.currency}
                                </span>
                            </div>

                            {paypalError && (
                                <div className="pr-paypal-error">
                                    <AlertTriangle size={14} />
                                    <span>{paypalError}</span>
                                    <button
                                        className="pr-paypal-retry"
                                        onClick={() => {
                                            setPaypalError(null);
                                            setPaypalLoading(true);
                                            approvalInProgress.current = false;
                                            const snapshot = intlPayModal;
                                            setIntlPayModal(null);
                                            setTimeout(
                                                () => setIntlPayModal(snapshot),
                                                50,
                                            );
                                        }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            )}

                            {paypalLoading && !paypalError && (
                                <div className="pr-paypal-loader">
                                    <span className="pr-dot" />
                                    <span className="pr-dot" />
                                    <span className="pr-dot" />
                                </div>
                            )}

                            <div
                                id="paypal-button-container"
                                style={{
                                    display:
                                        paypalLoading || paypalError
                                            ? "none"
                                            : "block",
                                }}
                            />

                            <p className="pr-paypal-notice">
                                <Lock size={16} /> Secured by PayPal. Your card
                                details are never stored on our servers.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
