import React, { useState, useEffect } from "react";
import { authFetch } from "./authfetch";
import { Link } from "react-router-dom";
import { IndianRupee } from "lucide-react";

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

    const planOrder = {
        FREE: 0,
        STARTER: 1,
        PRO: 2,
        ENTERPRISE: 3,
    };

    // Fetch user subscription
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

    // Fetch pricing
    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/pricing`);
                const data = await res.json();

                if (data.success) {
                    setPrices(data.pricing);
                }
            } catch (err) {
                console.error("Pricing fetch error", err);
            }
        };

        fetchPricing();
    }, [API_BASE_URL]);

    const savings = (plan) => {
        if (!prices || !prices[plan]) return 0;

        const monthly = prices[plan].monthly;
        const yearly = prices[plan].yearly;

        return monthly * 12 - yearly;
    };

    // Upgrade / Payment
    const handleUpgrade = async (selectedPlan) => {
        if (!token) return;

        const res = await authFetch(
            `${API_BASE_URL}/api/payment/create-order`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    plan: selectedPlan,
                    billing,
                }),
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
                            billing: billing,
                        }),
                    },
                );

                const verifyData = await verifyRes.json();

                if (verifyData.success) {
                    window.location.reload();
                } else {
                    alert("Payment verification failed");
                }
            },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    if (!prices || !plan) {
        return (
            <div className="container text-center mt-5">
                <div className="spinner-border text-primary"></div>
                <p className="mt-3">Loading pricing...</p>
            </div>
        );
    }

    const renderLimits = (planKey) => {
        const p = prices[planKey];

        return (
            <>
                <li className="feature-check">✔ Unlimited Patients</li>
                {p.staffLimit === -1 ? (
                    <li className="feature-check"> ✔ Unlimited Staff</li>
                ) : (
                    <li className="feature-limit">
                        ⚠ {p.staffLimit} Staff Accounts
                    </li>
                )}
                <li className="feature-check">✔ Appointments</li>
                <li className="feature-check">✔ Billing</li>
                <li className={p.analytics ? "feature-check" : "feature-cross"}>
                    {p.analytics
                        ? "✔ Analytics Dashboard"
                        : "✖ Analytics Dashboard"}
                </li>
                <li className={p.analytics ? "feature-check" : "feature-cross"}>
                    {p.analytics ? "✔ Revenue Insights" : "✖ Revenue Insights"}
                </li>{" "}
                <li className={p.analytics ? "feature-check" : "feature-cross"}>
                    {p.analytics
                        ? "✔ Payment Analytics"
                        : "✖ Payment Analytics"}
                </li>
                {p.excelLimit === -1 ? (
                    <li className="feature-check">Unlimited Excel Downloads</li>
                ) : (
                    <li className="feature-limit">
                        ⚠ {p.excelLimit} Excel Downloads
                    </li>
                )}
                {p.invoiceLimit === -1 ? (
                    <li className="feature-check">
                        Unlimited Invoice Downloads
                    </li>
                ) : (
                    <li className="feature-limit">
                        ⚠ {p.invoiceLimit} Invoice Downloads
                    </li>
                )}
            </>
        );
    };

    return (
        <div className="container">
            <div className="text-center mb-4">
                <h2 className="fw-bold">Subscription & Pricing</h2>
                <p className="text-theme-primary">
                    Choose the best plan for your clinic.
                </p>
            </div>

            {/* Billing toggle */}

            <div className="d-flex justify-content-center mb-5">
                <div className="btn-group">
                    <button
                        className={`btn ${
                            billing === "monthly"
                                ? "btn-primary"
                                : "btn-outline-primary"
                        }`}
                        onClick={() => setBilling("monthly")}
                    >
                        Monthly
                    </button>

                    <button
                        className={`btn ${
                            billing === "yearly"
                                ? "btn-primary"
                                : "btn-outline-primary"
                        }`}
                        onClick={() => setBilling("yearly")}
                    >
                        Yearly (Save ~17%)
                    </button>
                </div>
            </div>

            {/* Current Plan */}

            {token && role === "doctor" && (
                <div className="card border-0 shadow-sm mb-5 text-center">
                    <div className="card-body">
                        <h5 className="mb-2">Current Plan</h5>

                        <span className="badge bg-primary fs-6 px-3 py-2 text-uppercase">
                            {plan}
                        </span>
                    </div>

                    <p className="text-center text-theme-secondary small mt-3">
                        Cancel anytime • Secure payments • No hidden charges
                    </p>
                </div>
            )}

            {/* Pricing cards */}

            <div className="row g-4 justify-content-center">
                {["starter", "pro", "enterprise"].map((p) => {
                    const planUpper = p.toUpperCase();

                    return (
                        <div className="col-lg-3 col-md-6" key={p}>
                            <div className="card h-100 shadow-sm text-center p-4">
                                <h5 className="fw-bold text-capitalize">{p}</h5>

                                <h2 className="fw-bold mt-2">
                                    <IndianRupee size={28} />
                                    {prices[p][billing]}
                                </h2>

                                {billing === "yearly" && (
                                    <>
                                        <p className="small text-theme-secondary">
                                            <s>
                                                <IndianRupee size={16} />
                                                {prices[p].monthly * 12}
                                            </s>
                                        </p>

                                        <p className="text-theme-primary small">
                                            Save <IndianRupee size={14} />
                                            {savings(p)}
                                            {"/"}per{" "}
                                            {billing === "monthly"
                                                ? "month"
                                                : "year"}
                                        </p>
                                    </>
                                )}

                                <ul className="list-unstyled small mt-3">
                                    {renderLimits(p)}
                                </ul>

                                {/* Button logic */}

                                {!token ? (
                                    <Link
                                        to={`/signup?plan=${p}&billing=${billing}`}
                                        className="btn btn-primary mt-3"
                                    >
                                        Start Free Trial
                                    </Link>
                                ) : plan === planUpper &&
                                  billingCycle === billing ? (
                                    <button
                                        className="btn btn-secondary mt-3"
                                        disabled
                                    >
                                        Current Plan
                                    </button>
                                ) : planOrder[plan] > planOrder[planUpper] ? (
                                    <button className="btn btn-outline-secondary mt-3">
                                        Downgrade
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary mt-3"
                                        onClick={() => handleUpgrade(p)}
                                    >
                                        Upgrade
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!token && (
                <p className="text-theme-primary text-center mt-5 small">
                    Billing begins after your 30-day free trial. Cancel anytime
                    before trial ends to avoid charges.
                </p>
            )}
        </div>
    );
}
