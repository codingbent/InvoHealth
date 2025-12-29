import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
            props.showAlert("Enter a valid 10-digit phone number", "warning");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });

            const data = await res.json();

            if (data.success) {
                setSessionId(data.sessionId);
                props.showAlert("OTP sent successfully", "success");
            } else {
                props.showAlert(data.error || "Failed to send OTP", "danger");
            }
        } catch (err) {
            props.showAlert("Server error. Try again.", "danger");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        if (otp.length !== 6) return;

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    otp,
                    sessionId,
                }),
            });

            const data = await res.json();

            if (data.success) {
                if (data.success) {
                    setIsVerified(true);
                } else {
                    props.showAlert(data.error || "Invalid OTP", "danger");
                }

                localStorage.setItem("name", data.name);
                localStorage.setItem("role", data.role);
            } else {
                props.showAlert(data.error || "Invalid OTP", "danger");
            }
        } catch (err) {
            props.showAlert("Verification failed", "danger");
        } finally {
            setLoading(false);
        }
    };
    const resetPassword = async () => {
        if (newPassword.length < 6) {
            props.showAlert("Password must be at least 6 characters", "danger");
            return;
        }

        if (newPassword !== confirmPassword) {
            props.showAlert("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone,
                    newPassword,
                    sessionId,
                }),
            });

            const data = await res.json();

            if (data.success) {
                props.showAlert("Password reset successfully", "success");
                navigate("/login");
            } else {
                props.showAlert(data.error || "Failed to reset password", "danger");
            }
        } catch (err) {
            props.showAlert("Server error Try again later", "danger");
        } finally {
            setLoading(false);
        }
    };
    const styles = {
        card: {
            width: "100%",
            maxWidth: "420px",
            background: "#fff",
            borderRadius: "20px",
            padding: "32px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
        },
        header: {
            textAlign: "center",
            marginBottom: "24px",
        },
        title: {
            margin: 0,
            fontSize: "22px",
            fontWeight: 600,
        },
        subtitle: {
            marginTop: "6px",
            fontSize: "14px",
            color: "#6b7280",
        },
        field: {
            marginBottom: "16px",
        },
        label: {
            fontSize: "13px",
            color: "#374151",
            marginBottom: "6px",
            display: "block",
        },
        input: {
            width: "100%",
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            fontSize: "15px",
            outline: "none",
        },
        otpInput: {
            letterSpacing: "10px",
            textAlign: "center",
            fontSize: "18px",
        },
        primaryBtn: {
            width: "100%",
            padding: "12px",
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            fontSize: "15px",
            fontWeight: 500,
            cursor: "pointer",
            marginTop: "8px",
        },
        outlineBtn: {
            width: "100%",
            padding: "12px",
            background: "transparent",
            color: "#6366f1",
            border: "1px solid #6366f1",
            borderRadius: "12px",
            fontSize: "15px",
            cursor: "pointer",
            marginBottom: "16px",
        },
        hint: {
            display: "block",
            marginTop: "12px",
            textAlign: "center",
            fontSize: "12px",
            color: "#6b7280",
        },
    };
    return (
        <div className="container-fluid">
            <div
                className="row justify-content-center align-items-center"
                style={{ minHeight: "calc(100vh - 64px)" }}
            >
                <div className="col-11 col-sm-8 col-md-6 col-lg-4">
                    <div style={styles.card}>
                        {/* Header */}
                        <div style={styles.header}>
                            <h2 style={styles.title}>
                                {isVerified
                                    ? "Reset Password"
                                    : "Forgot Password"}
                            </h2>
                            <p style={styles.subtitle}>
                                {isVerified
                                    ? "Create a new secure password"
                                    : "Verify your registered phone number"}
                            </p>
                        </div>

                        {!isVerified ? (
                            <>
                                {/* Phone */}
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        className="form-control"
                                        placeholder="Registered phone number"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                        style={styles.input}
                                    />
                                </div>

                                <button
                                    className="btn btn-outline-primary w-100 mb-3"
                                    onClick={sendOtp}
                                    disabled={loading}
                                >
                                    {loading ? "Sending OTP..." : "Send OTP"}
                                </button>

                                {/* OTP */}
                                <div className="text-center mb-3">
                                    <label style={styles.label}>
                                        Enter OTP
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control text-center"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        disabled={!sessionId}
                                        style={{
                                            ...styles.input,
                                            ...styles.otpInput,
                                        }}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary w-100"
                                    onClick={verifyOtp}
                                    disabled={otp.length !== 6 || loading}
                                >
                                    Verify OTP
                                </button>

                                <small className="text-muted d-block text-center mt-3">
                                    OTP is valid for 5 minutes
                                </small>
                            </>
                        ) : (
                            <>
                                {/* New Password */}
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        placeholder="New password"
                                        value={newPassword}
                                        onChange={(e) =>
                                            setNewPassword(e.target.value)
                                        }
                                        style={styles.input}
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div style={styles.field}>
                                    <label style={styles.label}>
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        placeholder="Confirm password"
                                        value={confirmPassword}
                                        onChange={(e) =>
                                            setConfirmPassword(e.target.value)
                                        }
                                        style={styles.input}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary w-100"
                                    onClick={resetPassword}
                                    disabled={loading}
                                >
                                    {loading ? "Updating..." : "Reset Password"}
                                </button>
                            </>
                        )}
                        <div className="text-center mt-3">
                            <Link
                                to="/login"
                                className="text-decoration-none text-primary fw-medium"
                            >
                                ← Back to Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
