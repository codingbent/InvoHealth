import { Eye, EyeOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../../css/Doctorlist.css";

const subscriptionPlans = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

const PLAN_COLORS = {
    FREE: {
        bg: "rgba(148,163,184,0.1)",
        border: "rgba(148,163,184,0.2)",
        color: "#94a3b8",
    },
    STARTER: {
        bg: "rgba(96,165,250,0.1)",
        border: "rgba(96,165,250,0.2)",
        color: "#60a5fa",
    },
    PRO: {
        bg: "rgba(167,139,250,0.1)",
        border: "rgba(167,139,250,0.2)",
        color: "#a78bfa",
    },
    ENTERPRISE: {
        bg: "rgba(251,146,60,0.1)",
        border: "rgba(251,146,60,0.2)",
        color: "#fb923c",
    },
};

const AdminDoctors = () => {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState(null);
    const [visiblePhones, setVisiblePhones] = useState({});

    useEffect(() => {
        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add("dark-theme");
    }, []);

    const fetchDoctors = useCallback(async () => {
        try {
            const token = localStorage.getItem("admintoken");
            if (!token) {
                navigate("/admin/login");
                return;
            }
            const response = await fetch(
                `${API_BASE_URL}/api/admin/fetchall_doctors`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "admin-token": token,
                    },
                },
            );
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Failed to fetch doctors");
                setLoading(false);
                return;
            }
            setDoctors(data.doctors);
            setLoading(false);
        } catch {
            setError("Server error");
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        fetchDoctors();
    }, [fetchDoctors]);

    const handleSubscriptionChange = async (doctorId, newPlan) => {
        try {
            setUpdating(doctorId);
            const token = localStorage.getItem("admintoken");
            const res = await fetch(
                `${API_BASE_URL}/api/admin/update_subscription/${doctorId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "admin-token": token,
                    },
                    body: JSON.stringify({ plan: newPlan }),
                },
            );
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to update subscription");
                return;
            }
            setDoctors((prev) =>
                prev.map((doc) =>
                    doc._id === doctorId
                        ? {
                              ...doc,
                              subscription: {
                                  ...doc.subscription,
                                  plan: newPlan,
                              },
                          }
                        : doc,
                ),
            );
        } catch {
            alert("Failed to update subscription");
        } finally {
            setUpdating(null);
        }
    };

    const handleTogglePhone = async (docId) => {
        const token = localStorage.getItem("admintoken");

        // already visible → hide again
        if (visiblePhones[docId]?.visible) {
            setVisiblePhones((prev) => ({
                ...prev,
                [docId]: {
                    ...prev[docId],
                    visible: false,
                },
            }));
            return;
        }

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/admin/get_doctor_phone/${docId}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "admin-token": token,
                    },
                },
            );

            const data = await res.json();

            if (!res.ok) {
                alert(data.error || "Unauthorized");
                return;
            }

            setVisiblePhones((prev) => ({
                ...prev,
                [docId]: {
                    phone: data.phone,
                    visible: true,
                },
            }));
        } catch {
            alert("Failed to fetch phone");
        }
    };

    useEffect(() => {
        const role = localStorage.getItem("role");
        const token = localStorage.getItem("admintoken");

        if (!token || role !== "superadmin") {
            navigate("/admin/login_admin");
        }
    }, [navigate]);

    return (
        <>
            <div className="ad-root">
                <div className="ad-eyebrow">InvoHealth · Admin</div>
                <div className="ad-title">
                    Registered <em>Doctors</em>
                </div>

                {loading ? (
                    <div className="ad-center">
                        <span className="ad-dot" />
                        <span className="ad-dot" />
                        <span className="ad-dot" />
                    </div>
                ) : error ? (
                    <div className="ad-center ad-error-msg">{error}</div>
                ) : (
                    <div className="ad-card">
                        {/* Desktop */}
                        <table className="ad-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Center</th>
                                    <th>Phone</th>
                                    <th>Subscription</th>
                                </tr>
                            </thead>
                            <tbody>
                                {doctors.map((doc) => {
                                    const plan =
                                        doc.subscription?.plan?.toUpperCase() ||
                                        "FREE";
                                    const pc =
                                        PLAN_COLORS[plan] || PLAN_COLORS.FREE;
                                    return (
                                        <tr key={doc._id}>
                                            <td className="ad-td-name">
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 7,
                                                            background:
                                                                "rgba(77,124,246,0.1)",
                                                            border: "1px solid rgba(77,124,246,0.15)",
                                                            color: "#60a5fa",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "center",
                                                            fontSize: 11,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        {doc.name
                                                            ?.charAt(0)
                                                            ?.toUpperCase()}
                                                    </span>
                                                    {doc.name}
                                                </div>
                                            </td>
                                            <td>{doc.email}</td>
                                            <td>{doc.clinicName}</td>
                                            <td>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: 8,
                                                    }}
                                                >
                                                    <span>
                                                        {visiblePhones[doc._id]
                                                            ?.visible
                                                            ? visiblePhones[
                                                                  doc._id
                                                              ]?.phone
                                                            : "XXXXXX" +
                                                              (doc.phoneLast4 ||
                                                                  "")}
                                                    </span>

                                                    <button
                                                        onClick={() =>
                                                            handleTogglePhone(
                                                                doc._id,
                                                            )
                                                        }
                                                        style={{
                                                            background:
                                                                "transparent",
                                                            border: "none",
                                                            cursor: "pointer",
                                                            fontSize: 14,
                                                            color: "#60a5fa",
                                                        }}
                                                    >
                                                        {visiblePhones[doc._id]
                                                            ?.visible ? (
                                                            <EyeOff size={16} />
                                                        ) : (
                                                            <Eye size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    value={
                                                        doc.subscription
                                                            ?.plan || "FREE"
                                                    }
                                                    disabled={
                                                        updating === doc._id
                                                    }
                                                    onChange={(e) =>
                                                        handleSubscriptionChange(
                                                            doc._id,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="ad-plan-select"
                                                    style={{
                                                        background: pc.bg,
                                                        borderColor: pc.border,
                                                        color: pc.color,
                                                    }}
                                                >
                                                    {subscriptionPlans.map(
                                                        (p) => (
                                                            <option
                                                                key={p}
                                                                value={p}
                                                            >
                                                                {p}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Mobile */}
                        <div className="ad-mob-cards" style={{ padding: 12 }}>
                            {doctors.map((doc) => {
                                const plan =
                                    doc.subscription?.plan?.toUpperCase() ||
                                    "FREE";
                                const pc =
                                    PLAN_COLORS[plan] || PLAN_COLORS.FREE;
                                return (
                                    <div key={doc._id} className="ad-mob-card">
                                        <div className="ad-mob-name">
                                            {doc.name}
                                        </div>
                                        <div className="ad-mob-meta">
                                            {doc.email}
                                        </div>
                                        <div className="ad-mob-meta">
                                            {doc.clinicName} ·
                                            {visiblePhones[doc._id]?.visible
                                                ? visiblePhones[doc._id]?.phone
                                                : "XXXXXX" +
                                                  (doc.phoneLast4 || "")}
                                            <button
                                                style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    fontSize: 14,
                                                    color: "#60a5fa",
                                                }}
                                                onClick={() =>
                                                    handleTogglePhone(doc._id)
                                                }
                                            >
                                                {visiblePhones[doc._id]
                                                    ?.visible ? (
                                                    <EyeOff size={16} />
                                                ) : (
                                                    <Eye size={16} />
                                                )}
                                            </button>
                                        </div>
                                        <div className="ad-mob-footer">
                                            <select
                                                value={
                                                    doc.subscription?.plan ||
                                                    "FREE"
                                                }
                                                disabled={updating === doc._id}
                                                onChange={(e) =>
                                                    handleSubscriptionChange(
                                                        doc._id,
                                                        e.target.value,
                                                    )
                                                }
                                                className="ad-plan-select"
                                                style={{
                                                    background: pc.bg,
                                                    borderColor: pc.border,
                                                    color: pc.color,
                                                }}
                                            >
                                                {subscriptionPlans.map((p) => (
                                                    <option key={p} value={p}>
                                                        {p}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminDoctors;
