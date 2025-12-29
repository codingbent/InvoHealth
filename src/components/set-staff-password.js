import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function SetStaffPassword(props) {
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
            props.showAlert("Password must be at least 6 characters", "danger");
            return;
        }

        if (password !== confirm) {
            props.showAlert("Passwords do not match", "danger");
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
            props.showAlert("Password set successfully. Please login.", "success");
            navigate("/login");
        } else {
            props.showAlert(data.error||"Server Error try again later", "danger");
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
