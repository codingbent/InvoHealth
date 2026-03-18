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

    const [loading, setLoading] = useState(false);

    // 🔐 Redirect if not admin
    useEffect(() => {
        if (localStorage.getItem("role") !== "superadmin") {
            navigate("/");
        }
    }, [navigate]);

    // 📦 Fetch pricing
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
                        discount: data.pricing.discount ?? 17, // ✅ fallback fix
                        starter: data.pricing.starter,
                        pro: data.pricing.pro,
                        enterprise: data.pricing.enterprise,
                    });
                }
            } catch (err) {
                console.error("Fetch failed:", err);
            }
        };

        fetchPricing();
    }, [API_BASE_URL]);

    // 📊 Yearly calculation (UI only)
    const calculateYearly = (monthly, discount) => {
        return Math.round(monthly * 12 * (1 - discount / 100));
    };

    // ✏️ Handle input
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

    // 💾 Save pricing
    const savePricing = async () => {
        try {
            // ✅ validation
            if (
                pricing.starter.monthly <= 0 ||
                pricing.pro.monthly <= 0 ||
                pricing.enterprise.monthly <= 0
            ) {
                alert("Monthly price must be greater than 0");
                return;
            }

            if (pricing.discount < 0 || pricing.discount > 100) {
                alert("Discount must be between 0 and 100");
                return;
            }

            setLoading(true);

            const payload = {
                discount:
                    typeof pricing.discount === "number"
                        ? pricing.discount
                        : 17,
                starter: { ...pricing.starter },
                pro: { ...pricing.pro },
                enterprise: { ...pricing.enterprise },
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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <h2 className="fw-bold text-center mb-5">Pricing Management</h2>

            {/* DISCOUNT */}
            <div className="card shadow-sm p-4 mb-5">
                <h5 className="fw-bold mb-3">Yearly Discount</h5>

                <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-control"
                    value={pricing.discount}
                    onChange={(e) => {
                        let val = Number(e.target.value);
                        if (val < 0) val = 0;
                        if (val > 100) val = 100;

                        setPricing((prev) => ({
                            ...prev,
                            discount: val,
                        }));
                    }}
                />

                <div className="small mt-2">Example: 17 means 17% discount</div>
            </div>

            {/* PLANS */}
            <div className="row g-4">
                {["starter", "pro", "enterprise"].map((plan) => {
                    const monthly = pricing[plan]?.monthly || 0;
                    const yearly = calculateYearly(monthly, pricing.discount);

                    return (
                        <div className="col-md-4" key={plan}>
                            <div className="card p-4 h-100">
                                <h5 className="fw-bold text-uppercase">
                                    {plan}
                                </h5>

                                {/* MONTHLY */}
                                <label className="mt-3">Monthly</label>
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

                                {/* YEARLY */}
                                <div className="mt-3">
                                    <label>Yearly (auto)</label>
                                    <div className="form-control">
                                        <IndianRupee size={16} /> {yearly}
                                    </div>
                                </div>

                                <hr />

                                {/* LIMITS */}
                                <label>Staff</label>
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

                                <label className="mt-2">Excel Limit</label>
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

                                <label className="mt-2">Invoice Limit</label>
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

                                <div className="form-check mt-3">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={pricing[plan].analytics}
                                        onChange={(e) =>
                                            handleChange(
                                                plan,
                                                "analytics",
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    <label>Analytics</label>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* SAVE BUTTON */}
            <div className="text-center mt-5">
                <button
                    className="btn btn-primary px-5"
                    onClick={savePricing}
                    disabled={loading}
                >
                    {loading ? "Saving..." : "Save Pricing"}
                </button>
            </div>
        </div>
    );
}
