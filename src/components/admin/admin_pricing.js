import { useState, useEffect } from "react";
import {
    IndianRupee,
    Save,
    Check,
    Tag,
    Globe,
    Plus,
    ToggleLeft,
    ToggleRight,
} from "lucide-react";
import { useNavigate } from "react-router";
import { authFetch } from "../authfetch";
import { API_BASE_URL } from "../config";
import "../../css/Adminpricing.css";

const PLAN_COLORS = {
    starter: { accent: "#60a5fa", glow: "rgba(96,165,250,0.15)" },
    pro: { accent: "#a78bfa", glow: "rgba(167,139,250,0.15)" },
    enterprise: { accent: "#fb923c", glow: "rgba(251,146,60,0.15)" },
};

export default function AdminPricing() {
    const navigate = useNavigate();
    const [pricing, setPricing] = useState({
        discount: 8.5,
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
    const [showINR, setShowINR] = useState(false);
    const [countries, setCountries] = useState([]);
    const [multipliers, setMultipliers] = useState({});

    // ── country form refs via controlled state ──
    const [newCountry, setNewCountry] = useState({
        code: "",
        name: "",
        currency: "",
        dialCode: "",
        symbol: "",
        rate: "",
    });

    useEffect(() => {
        const fetchCountries = async () => {
            const res = await fetch(`${API_BASE_URL}/api/admin/country`);
            const data = await res.json();
            if (data.success) {
                setCountries(data.countries || []);
                const map = {};
                (data.countries || []).forEach((c) => {
                    map[c.code] = c.multiplier || 1;
                });
                setMultipliers(map);
            }
        };
        fetchCountries();
    }, []);

    const calc = (plan, mult, country) => {
        const baseINR = pricing[plan]?.monthly || 0;
        const adjustedINR = baseINR * mult;
        const yearlyINR = adjustedINR * 12 * (1 - pricing.discount / 100);
        if (showINR)
            return `₹${Math.round(adjustedINR)} / ₹${Math.round(yearlyINR)}`;
        const monthly = adjustedINR / country.rate;
        const yearly = yearlyINR / country.rate;
        return `${country.symbol}${monthly.toFixed(0)} / ${country.symbol}${yearly.toFixed(0)}`;
    };

    useEffect(() => {
        if (localStorage.getItem("role") !== "superadmin") navigate("/");
    }, [navigate]);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/admin/pricing`,
                );
                const data = await res.json();
                if (data.success) setPricing(data.pricing);
            } catch (err) {
                console.error("Pricing fetch error", err);
            }
        };
        fetchPricing();
    }, []);

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
                countryMultipliers: multipliers,
            };
            const res = await fetch(`${API_BASE_URL}/api/admin/update`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "admin-token": localStorage.getItem("admintoken"),
                },
                body: JSON.stringify(payload),
            });
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

    const handleAddCountry = async () => {
        const body = {
            code: newCountry.code,
            name: newCountry.name,
            dialCode: newCountry.dialCode,
            currency: newCountry.currency,
            symbol: newCountry.symbol,
            rate: Number(newCountry.rate),
        };
        const res = await fetch(`${API_BASE_URL}/api/admin/add_country`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "admin-token": localStorage.getItem("admintoken"),
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
            setCountries((prev) => [...prev, data.country]);
            setNewCountry({
                code: "",
                name: "",
                currency: "",
                dialCode: "",
                symbol: "",
                rate: "",
            });
        }
    };

    return (
        <div className="apr-root">
            <div className="apr-title">
                Pricing <em>Management</em>
            </div>

            {/* ── Discount ── */}
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
                            setPricing((prev) => ({ ...prev, discount: v }));
                        }}
                    />
                    <span className="apr-discount-unit">
                        % off monthly × 12
                    </span>
                </div>
                <div className="apr-hint">
                    Example: 17 = 17% discount on yearly billing
                </div>
            </div>

            {/* ── Plan cards ── */}
            <div className="apr-grid">
                {["starter", "pro", "enterprise"].map((plan) => {
                    const pc = PLAN_COLORS[plan];
                    const monthly = pricing[plan]?.monthly || 0;
                    const yearly = calculateYearly(monthly, pricing.discount);
                    return (
                        <div className="apr-plan-card" key={plan}>
                            <div
                                className="apr-plan-accent"
                                style={{
                                    background: `linear-gradient(90deg,transparent,${pc.accent}55,transparent)`,
                                }}
                            />
                            <div className="apr-plan-header">
                                <div
                                    className="apr-plan-dot"
                                    style={{ background: pc.accent }}
                                />
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
                                        Monthly Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        className="apr-input"
                                        value={monthly}
                                        onFocus={(e) =>
                                            (e.target.style.borderColor = `${pc.accent}66`)
                                        }
                                        onBlur={(e) =>
                                            (e.target.style.borderColor = "")
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
                                        Yearly (auto-calculated)
                                    </label>
                                    <div className="apr-readonly">
                                        <IndianRupee size={12} />
                                        {yearly}
                                    </div>
                                </div>

                                <div className="apr-divider" />

                                {[
                                    ["staffLimit", "Staff Limit"],
                                    ["excelLimit", "Excel Limit"],
                                    ["invoiceLimit", "Invoice Limit"],
                                    ["imageLimit", "Image Limit"],
                                ].map(([field, label]) => (
                                    <div className="apr-field" key={field}>
                                        <label className="apr-label">
                                            {label}{" "}
                                            <span className="apr-label-hint">
                                                −1 = unlimited
                                            </span>
                                        </label>
                                        <input
                                            type="number"
                                            className="apr-input"
                                            value={pricing[plan][field]}
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
                                                    field,
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                ))}

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
                                            checked={pricing[plan].analytics}
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

            {/* ── Add Country ── */}
            <div className="apr-discount-card">
                <div className="apr-card-label">
                    <Globe size={11} /> Add Country
                </div>
                <div className="apr-country-form">
                    {[
                        ["code", "Code", "US"],
                        ["name", "Name", "United States"],
                        ["currency", "Currency", "USD"],
                        ["symbol", "Symbol", "$"],
                        ["rate", "INR Rate", "95"],
                    ].map(([key, label, ph]) => (
                        <div className="apr-field" key={key}>
                            <label className="apr-label">{label}</label>
                            <input
                                type={key === "rate" ? "number" : "text"}
                                className="apr-input"
                                placeholder={ph}
                                value={newCountry[key]}
                                onChange={(e) =>
                                    setNewCountry((p) => ({
                                        ...p,
                                        [key]: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    ))}
                    <button className="apr-add-btn" onClick={handleAddCountry}>
                        <Plus size={13} /> Add
                    </button>
                </div>
            </div>

            {/* ── Country Pricing Preview ── */}
            <div className="apr-discount-card">
                <div className="apr-section-header">
                    <div className="apr-card-label" style={{ margin: 0 }}>
                        <Globe size={11} /> Country Pricing Preview
                    </div>
                    <label className="apr-inr-toggle">
                        <input
                            type="checkbox"
                            checked={showINR}
                            onChange={() => setShowINR(!showINR)}
                        />
                        <span className="apr-inr-track">
                            <span className="apr-inr-thumb" />
                        </span>
                        <span className="apr-inr-label">Show INR</span>
                    </label>
                </div>

                <div className="apr-table-wrap">
                    <table className="apr-table">
                        <thead>
                            <tr>
                                <th>Country</th>
                                <th>Multiplier</th>
                                <th>Rate (INR)</th>
                                <th
                                    style={{
                                        color: PLAN_COLORS.starter.accent,
                                    }}
                                >
                                    Starter
                                </th>
                                <th style={{ color: PLAN_COLORS.pro.accent }}>
                                    Pro
                                </th>
                                <th
                                    style={{
                                        color: PLAN_COLORS.enterprise.accent,
                                    }}
                                >
                                    Enterprise
                                </th>
                                <th>Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(countries || []).map((c) => (
                                <tr key={c.code}>
                                    <td>
                                        <span className="apr-country-name">
                                            {c.name} ({c.code})
                                        </span>
                                        <span className="apr-country-currency">
                                            {c.currency}
                                        </span>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="apr-input apr-mult-input"
                                            value={multipliers[c.code] || 1}
                                            onChange={async (e) => {
                                                const value = Number(
                                                    e.target.value,
                                                );
                                                setMultipliers((prev) => ({
                                                    ...prev,
                                                    [c.code]: value,
                                                }));
                                                await fetch(
                                                    `${API_BASE_URL}/api/admin/multiplier/${c.code}`,
                                                    {
                                                        method: "PUT",
                                                        headers: {
                                                            "Content-Type":
                                                                "application/json",
                                                            "admin-token":
                                                                localStorage.getItem(
                                                                    "admintoken",
                                                                ),
                                                        },
                                                        body: JSON.stringify({
                                                            multiplier: value,
                                                        }),
                                                    },
                                                );
                                                setCountries((prev) =>
                                                    prev.map((item) =>
                                                        item.code === c.code
                                                            ? {
                                                                  ...item,
                                                                  multiplier:
                                                                      value,
                                                              }
                                                            : item,
                                                    ),
                                                );
                                            }}
                                        />
                                    </td>
                                    <td>
                                        {" "}
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="apr-input apr-mult-input"
                                            value={c.rate ?? 1}
                                            onChange={async (e) => {
                                                const value = Number(
                                                    e.target.value,
                                                );
                                                // optimistic UI update
                                                setCountries((prev) =>
                                                    prev.map((item) =>
                                                        item.code === c.code
                                                            ? {
                                                                  ...item,
                                                                  rate: value,
                                                              }
                                                            : item,
                                                    ),
                                                );
                                                await fetch(
                                                    `${API_BASE_URL}/api/admin/rate/${c.code}`,
                                                    {
                                                        method: "PUT",
                                                        headers: {
                                                            "Content-Type":
                                                                "application/json",
                                                            "admin-token":
                                                                localStorage.getItem(
                                                                    "admintoken",
                                                                ),
                                                        },
                                                        body: JSON.stringify({
                                                            rate: value,
                                                        }),
                                                    },
                                                );
                                            }}
                                        />
                                    </td>
                                    <td className="apr-price-cell">
                                        {calc(
                                            "starter",
                                            multipliers[c.code] || 1,
                                            c,
                                        )}
                                    </td>
                                    <td className="apr-price-cell">
                                        {calc(
                                            "pro",
                                            multipliers[c.code] || 1,
                                            c,
                                        )}
                                    </td>
                                    <td className="apr-price-cell">
                                        {calc(
                                            "enterprise",
                                            multipliers[c.code] || 1,
                                            c,
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            onClick={async () => {
                                                const newStatus = !c.active;

                                                // UI update instantly
                                                setCountries((prev) =>
                                                    prev.map((item) =>
                                                        item.code === c.code
                                                            ? {
                                                                  ...item,
                                                                  active: newStatus,
                                                              }
                                                            : item,
                                                    ),
                                                );

                                                // API call
                                                await fetch(
                                                    `${API_BASE_URL}/api/admin/update_country`,
                                                    {
                                                        method: "POST",
                                                        headers: {
                                                            "Content-Type":
                                                                "application/json",
                                                            "admin-token":
                                                                localStorage.getItem(
                                                                    "admintoken",
                                                                ),
                                                        },
                                                        body: JSON.stringify({
                                                            code: c.code,
                                                            active: newStatus,
                                                        }),
                                                    },
                                                );
                                            }}
                                            className="apr-toggle-btn"
                                        >
                                            {c.active ? (
                                                <ToggleRight
                                                    size={20}
                                                    color="#22c55e"
                                                />
                                            ) : (
                                                <ToggleLeft
                                                    size={20}
                                                    color="#ef4444"
                                                />
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Save ── */}
            <div className="apr-save-row">
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
                        "Saving…"
                    ) : (
                        <>
                            <Save size={14} /> Save Pricing
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
