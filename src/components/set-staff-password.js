import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";
import { KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";

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
        return (
            <>
                <div className="ssp-root">
                    <div className="ssp-card">
                        <div className="ssp-invalid">
                            <AlertTriangle
                                size={22}
                                style={{ color: "#fb923c" }}
                            />
                            <span>Invalid access. No staff ID found.</span>
                        </div>
                    </div>
                </div>
            </>
        );
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
        const res = await authFetch(`${API_BASE_URL}/api/staff/set_password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId, password }),
        });
        const data = await res.json();
        setLoading(false);
        if (data.success) {
            props.showAlert(
                "Password set successfully. Please login.",
                "success",
            );
            navigate("/login");
        } else {
            props.showAlert(
                data.error || "Server Error try again later",
                "danger",
            );
        }
    };

    const match = confirm.length > 0 && password === confirm;
    const mismatch = confirm.length > 0 && password !== confirm;

    return (
        <>
            <div className="ssp-root">
                <div className="ssp-card">
                    {/* Header */}
                    <div className="ssp-header">
                        <div className="ssp-icon">
                            <KeyRound size={22} />
                        </div>
                        <h1 className="ssp-title">
                            Set Your <em>Password</em>
                        </h1>
                        <p className="ssp-subtitle">
                            Create a secure password for your staff account
                        </p>
                    </div>

                    {/* Fields */}
                    <div className="ssp-field">
                        <label className="ssp-label">New Password</label>
                        <input
                            type="password"
                            className="ssp-input"
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="ssp-field">
                        <label className="ssp-label">Confirm Password</label>
                        <div style={{ position: "relative" }}>
                            <input
                                type="password"
                                className={`ssp-input ${mismatch ? "ssp-input-error" : match ? "ssp-input-ok" : ""}`}
                                placeholder="Repeat password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                            {match && (
                                <span className="ssp-check-icon">
                                    <ShieldCheck
                                        size={15}
                                        style={{ color: "#4ade80" }}
                                    />
                                </span>
                            )}
                        </div>
                        {mismatch && (
                            <div className="ssp-field-error">
                                Passwords do not match
                            </div>
                        )}
                    </div>

                    <button
                        className="ssp-btn"
                        onClick={submitPassword}
                        disabled={loading}
                    >
                        <KeyRound size={14} />
                        {loading ? "Saving..." : "Set Password"}
                    </button>
                </div>
            </div>
        </>
    );
}
