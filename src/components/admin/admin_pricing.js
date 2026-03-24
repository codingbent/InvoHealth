import { useState, useEffect } from "react";
import { IndianRupee, Save, Check, Tag } from "lucide-react";
import { useNavigate } from "react-router";

const PLAN_COLORS = {
    starter: { accent: "#60a5fa", glow: "rgba(96,165,250,0.15)" },
    pro: { accent: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
    enterprise: { accent: "#fb923c", glow: "rgba(251,146,60,0.15)" },
};

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
            imageLimit: 0,
        },
        pro: {
            monthly: 0,
            staffLimit: 0,
            excelLimit: 0,
            invoiceLimit: 0,
            analytics: true,
            imageLimit: 0,
        },
        enterprise: {
            monthly: 0,
            staffLimit: 0,
            excelLimit: 0,
            invoiceLimit: 0,
            analytics: true,
            imageLimit: 0,
        },
    });
    const [loading, setLoading] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (localStorage.getItem("role") !== "superadmin") navigate("/");
    }, [navigate]);

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

    const calculateYearly = (monthly, discount) =>
        Math.round(monthly * 12 * (1 - discount / 100));

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
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            } else alert("Failed to update pricing");
        } catch (err) {
            console.error("Save failed:", err);
            alert("Server error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="apr-root">
                <div className="apr-title">
                    Pricing <em>Management</em>
                </div>

                {/* Discount */}
                <div className="apr-discount-card">
                    <div className="apr-card-label">
                        <Tag size={11} /> Yearly Discount
                    </div>
                    <div className="apr-discount-row">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            className="apr-input apr-input-sm"
                            value={pricing.discount}
                            onChange={(e) => {
                                let v = Number(e.target.value);
                                if (v < 0) v = 0;
                                if (v > 100) v = 100;
                                setPricing((prev) => ({
                                    ...prev,
                                    discount: v,
                                }));
                            }}
                        />
                        <span style={{ fontSize: 11, color: "#4a5a7a" }}>
                            % off monthly × 12
                        </span>
                    </div>
                    <div className="apr-hint">
                        Example: 17 = 17% discount on yearly billing
                    </div>
                </div>

                {/* Plan cards */}
                <div className="apr-grid">
                    {["starter", "pro", "enterprise"].map((plan) => {
                        const pc = PLAN_COLORS[plan];
                        const monthly = pricing[plan]?.monthly || 0;
                        const yearly = calculateYearly(
                            monthly,
                            pricing.discount,
                        );
                        return (
                            <div className="apr-plan-card" key={plan}>
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        left: "10%",
                                        right: "10%",
                                        height: 1,
                                        background: `linear-gradient(90deg,transparent,${pc.accent}55,transparent)`,
                                    }}
                                />
                                <div className="apr-plan-header">
                                    <div
                                        className="apr-plan-name"
                                        style={{ color: pc.accent }}
                                    >
                                        {plan.charAt(0).toUpperCase() +
                                            plan.slice(1)}
                                    </div>
                                </div>
                                <div className="apr-plan-body">
                                    <div className="apr-field">
                                        <label className="apr-label">
                                            Monthly Price
                                        </label>
                                        <input
                                            type="number"
                                            className="apr-input"
                                            value={monthly}
                                            style={{
                                                "--focus-color": pc.accent,
                                            }}
                                            onFocus={(e) =>
                                                (e.target.style.borderColor = `${pc.accent}66`)
                                            }
                                            onBlur={(e) =>
                                                (e.target.style.borderColor =
                                                    "")
                                            }
                                            onChange={(e) =>
                                                handleChange(
                                                    plan,
                                                    "monthly",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="apr-field">
                                        <label className="apr-label">
                                            Yearly (auto)
                                        </label>
                                        <div className="apr-readonly">
                                            <IndianRupee size={12} />
                                            {yearly}
                                        </div>
                                    </div>
                                    <div className="apr-divider" />
                                    <div className="apr-field">
                                        <label className="apr-label">
                                            Staff Limit{" "}
                                            <span
                                                style={{
                                                    fontSize: 8,
                                                }}
                                            >
                                                (-1 = unlimited)
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            className="apr-input"
                                            value={pricing[plan].staffLimit}
                                            onChange={(e) =>
                                                handleChange(
                                                    plan,
                                                    "staffLimit",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="apr-field">
                                        <label className="apr-label">
                                            Excel Limit{" "}
                                            <span
                                                style={{
                                                    fontSize: 8,
                                                }}
                                            >
                                                (-1 = unlimited)
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            className="apr-input"
                                            value={pricing[plan].excelLimit}
                                            onChange={(e) =>
                                                handleChange(
                                                    plan,
                                                    "excelLimit",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="apr-field">
                                        <label className="apr-label">
                                            Invoice Limit{" "}
                                            <span
                                                style={{
                                                    fontSize: 8,
                                                }}
                                            >
                                                (-1 = unlimited)
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            className="apr-input"
                                            value={pricing[plan].invoiceLimit}
                                            onChange={(e) =>
                                                handleChange(
                                                    plan,
                                                    "invoiceLimit",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="apr-field">
                                        <label className="apr-label">
                                            Image Limit{" "}
                                            <span
                                                style={{
                                                    fontSize: 8,
                                                }}
                                            >
                                                (-1 = unlimited)
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            className="apr-input"
                                            value={pricing[plan].imageLimit}
                                            onChange={(e) =>
                                                handleChange(
                                                    plan,
                                                    "imageLimit",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="apr-divider" />
                                    <div className="apr-toggle-row">
                                        <label
                                            className="apr-label"
                                            style={{ margin: 0 }}
                                        >
                                            Analytics Access
                                        </label>
                                        <label className="apr-toggle">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    pricing[plan].analytics
                                                }
                                                onChange={(e) =>
                                                    handleChange(
                                                        plan,
                                                        "analytics",
                                                        e.target.checked,
                                                    )
                                                }
                                            />
                                            <span className="apr-toggle-slider" />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                    <button
                        className={`apr-save-btn ${saved ? "saved" : ""}`}
                        onClick={savePricing}
                        disabled={loading}
                    >
                        {saved ? (
                            <>
                                <Check size={14} /> Saved!
                            </>
                        ) : loading ? (
                            "Saving..."
                        ) : (
                            <>
                                <Save size={14} /> Save Pricing
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}
