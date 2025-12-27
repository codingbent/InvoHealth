import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function SetStaffPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const { staffId } = location.state || {};

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    if (!staffId) {
        return <p className="text-center mt-5">Invalid access</p>;
    }

    const submitPassword = async () => {
        if (password.length < 6) {
            alert("Password must be at least 6 characters");
            return;
        }

        if (password !== confirm) {
            alert("Passwords do not match");
            return;
        }

        setLoading(true);

        const res = await fetch(
            `${API_BASE_URL}/api/auth/staff/set-password`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ staffId, password }),
            }
        );

        const data = await res.json();
        setLoading(false);

        if (data.success) {
            alert("Password set successfully. Please login.");
            navigate("/login");
        } else {
            alert(data.error);
        }
    };

    return (
        <div className="container mt-5" style={{ maxWidth: 400 }}>
            <div className="card p-4 shadow-sm">
                <h4 className="text-center mb-3">Set Your Password</h4>

                <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <input
                    type="password"
                    className="form-control mb-3"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                />

                <button
                    className="btn btn-primary w-100"
                    onClick={submitPassword}
                    disabled={loading}
                >
                    {loading ? "Saving..." : "Set Password"}
                </button>
            </div>
        </div>
    );
}
