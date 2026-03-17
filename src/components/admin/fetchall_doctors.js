import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const subscriptionPlans = ["FREE", "STARTER", "PRO", "ENTERPRISE"];

const AdminDoctors = () => {
    const navigate = useNavigate();
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updating, setUpdating] = useState(null);

    useEffect(() => {
        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add("dark-theme");
    }, []);
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

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
                        "auth-token": token,
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
    }, [API_BASE_URL, navigate]);

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
                        "auth-token": token,
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

    if (loading) return <div className="center">Loading...</div>;
    if (error) return <div className="center error">{error}</div>;
    if (localStorage.getItem("role") !== "superadmin") {
        navigate("/");
    }

    return (
        <div className={"admin-container container-fluid dark-theme"}>
            <h2 className="admin-title">Registered Doctors</h2>

            <div className="table-theme">
                <table className="modern-table table-theme">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Clinic</th>
                            <th>Phone</th>
                            <th>Subscription</th>
                        </tr>
                    </thead>

                    <tbody>
                        {doctors.map((doc) => (
                            <tr key={doc._id}>
                                <td>{doc.name}</td>
                                <td>{doc.email}</td>
                                <td>{doc.clinicName}</td>
                                <td>{doc.phone}</td>

                                <td>
                                    <select
                                        value={doc.subscription?.plan || "FREE"}
                                        disabled={updating === doc._id}
                                        onChange={(e) =>
                                            handleSubscriptionChange(
                                                doc._id,
                                                e.target.value,
                                            )
                                        }
                                        className={`subscription-select plan-${doc.subscription?.plan?.toLowerCase()}`}
                                    >
                                        {subscriptionPlans.map((plan) => (
                                            <option key={plan} value={plan}>
                                                {plan}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile View */}
                <div className="mobile-cards">
                    {doctors.map((doc) => (
                        <div key={doc._id} className="doctor-card">
                            <h3>{doc.name}</h3>

                            <p>
                                <strong>Email:</strong> {doc.email}
                            </p>

                            <p>
                                <strong>Clinic:</strong> {doc.clinicName}
                            </p>

                            <p>
                                <strong>Phone:</strong> {doc.phone}
                            </p>

                            <select
                                value={doc.subscription?.plan || "FREE"}
                                disabled={updating === doc._id}
                                onChange={(e) =>
                                    handleSubscriptionChange(
                                        doc._id,
                                        e.target.value,
                                    )
                                }
                                className="subscription-select"
                            >
                                {subscriptionPlans.map((plan) => (
                                    <option key={plan} value={plan}>
                                        {plan}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminDoctors;
