import { useState, useEffect } from "react";
import { IndianRupee } from "lucide-react";
import { useNavigate } from "react-router";

export default function AdminPricing() {
    const navigate = useNavigate();

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [pricing, setPricing] = useState({
        discount: 17,
        starter: {
            monthly: 0,
            staffLimit: 0,
            excelLimit: 0,
            invoiceLimit: 0,
            analytics: false,
        },
        pro: {
            monthly: 0,
            staffLimit: 0,
            excelLimit: 0,
            invoiceLimit: 0,
            analytics: true,
        },
        enterprise: {
            monthly: 0,
            staffLimit: 0,
            excelLimit: 0,
            invoiceLimit: 0,
            analytics: true,
        },
    });

    // Redirect if not superadmin
    useEffect(() => {
        if (localStorage.getItem("role") !== "superadmin") {
            navigate("/");
        }
    }, [navigate]);

    // Fetch pricing
    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/pricing`, {
                    headers: {
                        "admin-token": localStorage.getItem("admintoken"),
                    },
                });

                const data = await res.json();

                if (data.success && data.pricing) {
                    setPricing({
                        discount: data.pricing.discount ?? 17,
                        ...data.pricing,
                    });
                }
            } catch (err) {
                console.error("Fetch failed:", err);
            }
        };

        fetchPricing();
    }, [API_BASE_URL]);

    // Yearly calculation
    const calculateYearly = (monthly, discount) => {
        const discountDecimal = (discount ?? 0) / 100;
        return Math.round(monthly * 12 * (1 - discountDecimal));
    };

    const handleChange = (plan, field, value) => {
        setPricing((prev) => ({
            ...prev,
            [plan]: {
                ...prev[plan],
                [field]:
                    field === "analytics"
                        ? value
                        : value === ""
                          ? ""
                          : Number(value),
            },
        }));
    };

    const savePricing = async () => {
        try {
            const payload = {
                discount: pricing.discount,

                starter: {
                    ...pricing.starter,
                    yearly: calculateYearly(pricing.starter.monthly),
                },

                pro: {
                    ...pricing.pro,
                    yearly: calculateYearly(pricing.pro.monthly),
                },

                enterprise: {
                    ...pricing.enterprise,
                    yearly: calculateYearly(pricing.enterprise.monthly),
                },
            };

            const res = await fetch(
                `${API_BASE_URL}/api/admin/pricing/update`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "admin-token": localStorage.getItem("admintoken"),
                    },
                    body: JSON.stringify(payload),
                },
            );

            const data = await res.json();

            if (data.success) {
                alert("Pricing updated successfully");
            } else {
                alert("Failed to update pricing");
            }
        } catch (err) {
            console.error("Save failed:", err);
            alert("Server error");
        }
    };

    return (
        <div className="container py-5">
            <h2 className="fw-bold text-center mb-5">Pricing Management</h2>

            {/* Discount Card */}
            <div className="card shadow-sm p-4 mb-5">
                <h5 className="fw-bold mb-3">Yearly Discount</h5>

                <label>Discount Percentage (0 - 100)</label>

                <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-control"
                    value={pricing.discount}
                    onChange={(e) =>
                        setPricing((prev) => ({
                            ...prev,
                            discount: Number(e.target.value),
                        }))
                    }
                />

                <div className="small text-theme-secondary mt-2">
                    Example: 17 means 17% discount on yearly billing
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="row g-4">
                {["starter", "pro", "enterprise"].map((plan) => {
                    const monthly = pricing[plan]?.monthly || 0;
                    const yearly = calculateYearly(monthly, pricing.discount);

                    return (
                        <div className="col-md-4" key={plan}>
                            <div className="card shadow-sm p-4 h-100">
                                <h5 className="fw-bold text-uppercase">
                                    {plan}
                                </h5>

                                {/* Monthly */}
                                <label className="mt-3">Monthly Price</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={monthly}
                                    onChange={(e) =>
                                        handleChange(
                                            plan,
                                            "monthly",
                                            e.target.value,
                                        )
                                    }
                                />

                                {/* Yearly */}
                                <div className="mt-3">
                                    <label>Yearly Price (auto)</label>
                                    <div className="form-control bg-theme-secondary">
                                        <IndianRupee size={18} /> {yearly}
                                    </div>
                                </div>

                                <div className="mt-2 text-success small">
                                    Discount Applied: {pricing.discount}%
                                </div>

                                <hr />

                                <h6 className="fw-bold mt-3">Plan Limits</h6>

                                {/* Staff */}
                                <label className="mt-2">Staff Limit</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={pricing[plan].staffLimit}
                                    onChange={(e) =>
                                        handleChange(
                                            plan,
                                            "staffLimit",
                                            e.target.value,
                                        )
                                    }
                                />

                                {/* Excel */}
                                <label className="mt-2">
                                    Excel Export Limit
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={pricing[plan].excelLimit}
                                    onChange={(e) =>
                                        handleChange(
                                            plan,
                                            "excelLimit",
                                            e.target.value,
                                        )
                                    }
                                />

                                {/* Invoice */}
                                <label className="mt-2">
                                    Invoice Download Limit
                                </label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={pricing[plan].invoiceLimit}
                                    onChange={(e) =>
                                        handleChange(
                                            plan,
                                            "invoiceLimit",
                                            e.target.value,
                                        )
                                    }
                                />

                                {/* Analytics */}
                                <div className="form-check mt-3">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={pricing[plan].analytics}
                                        onChange={(e) =>
                                            handleChange(
                                                plan,
                                                "analytics",
                                                e.target.checked,
                                            )
                                        }
                                    />

                                    <label className="form-check-label">
                                        Enable Analytics Dashboard
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="text-center mt-5">
                <button className="btn btn-primary px-5" onClick={savePricing}>
                    Save Pricing
                </button>
            </div>
        </div>
    );
}
