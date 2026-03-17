import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";

export default function ForgotPassword(props) {
    const navigate = useNavigate();

    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [loading, setLoading] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const sendOtp = async () => {
        if (phone.length !== 10) {
            props.showAlert("Enter valid phone number", "warning");
            return;
        }

        setLoading(true);

        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/authentication/send-reset-otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone }),
                },
            );

            const data = await res.json();

            if (data.success) {
                setSessionId(data.sessionId);
                props.showAlert("OTP sent successfully", "success");
            } else {
                props.showAlert(data.error || "Failed to send OTP", "danger");
            }
        } catch (err) {
            console.error(err);

            props.showAlert("Server error. Try again later.", "danger");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (otp.length !== 6) return;

        setLoading(true);

        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/authentication/verify-reset-otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, otp, sessionId }),
                },
            );

            const data = await res.json();

            if (data.success) {
                setIsVerified(true);
            } else {
                props.showAlert("Invalid OTP", "danger");
            }
        } catch {
            props.showAlert("Verification failed", "danger");
        }

        setLoading(false);
    };

    const resetPassword = async () => {
        if (newPassword.length < 6) {
            props.showAlert("Password must be 6 characters", "danger");
            return;
        }

        if (newPassword !== confirmPassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }

        setLoading(true);

        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/reset-password`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, newPassword, sessionId }),
                },
            );

            const data = await res.json();

            if (data.success) {
                props.showAlert("Password reset successfully", "success");
                navigate("/login");
            }
        } catch {
            props.showAlert("Server error", "danger");
        }

        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">
                    {isVerified ? "Reset Password" : "Forgot Password"}
                </h2>

                <p className="auth-subtitle">
                    {isVerified
                        ? "Create a new secure password"
                        : "Verify your registered phone number"}
                </p>

                {!isVerified ? (
                    <>
                        <input
                            type="tel"
                            className="auth-input"
                            placeholder="Registered phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />

                        <button
                            className="btn btn-outline-primary w-100 mb-3"
                            onClick={sendOtp}
                            disabled={loading}
                        >
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </button>

                        <input
                            type="text"
                            className="auth-input text-center"
                            placeholder="Enter OTP"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            disabled={!sessionId}
                        />

                        <button
                            className="btn btn-primary w-100 mt-3"
                            onClick={verifyOtp}
                            disabled={otp.length !== 6 || loading}
                        >
                            Verify OTP
                        </button>
                    </>
                ) : (
                    <>
                        <input
                            type="password"
                            className="auth-input"
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />

                        <input
                            type="password"
                            className="auth-input"
                            placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />

                        <button
                            className="btn btn-primary w-100 mt-3"
                            onClick={resetPassword}
                            disabled={loading}
                        >
                            {loading ? "Updating..." : "Reset Password"}
                        </button>
                    </>
                )}

                <div className="text-center mt-3">
                    <Link to="/login" className="auth-back">
                        ← Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
