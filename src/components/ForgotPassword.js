import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";
import {
    ShieldCheck,
    KeyRound,
    ArrowLeft,
    // Phone
} from "lucide-react";

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
            } else
                props.showAlert(data.error || "Failed to send OTP", "danger");
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
            if (data.success) setIsVerified(true);
            else props.showAlert("Invalid OTP", "danger");
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
        <>
            <div className="fp-root">
                <div className="fp-card">
                    {/* Step dots */}
                    <div className="fp-steps">
                        <div
                            className={`fp-step ${!sessionId ? "active" : "done"}`}
                        />
                        <div
                            className={`fp-step ${sessionId && !isVerified ? "active" : isVerified ? "done" : ""}`}
                        />
                        <div
                            className={`fp-step ${isVerified ? "active" : ""}`}
                        />
                    </div>

                    {/* Header */}
                    <div className="fp-header">
                        {/* <div
                            className={`fp-icon ${isVerified ? "verified" : ""}`}
                        >
                            {isVerified ? (
                                <KeyRound size={22} />
                            ) : (
                                <ShieldCheck size={22} />
                            )}
                        </div> */}
                        <h1 className="fp-title">
                            {isVerified ? (
                                <>
                                    Reset <em>Password</em>
                                </>
                            ) : (
                                <>
                                    Forgot <em>Password</em>
                                </>
                            )}
                        </h1>
                        <p className="fp-subtitle">
                            {isVerified
                                ? "Create a new secure password for your account"
                                : "Verify your registered phone number to continue"}
                        </p>
                    </div>

                    {!isVerified ? (
                        <>
                            {/* Phone */}
                            <div className="fp-field">
                                <label className="fp-label">Phone Number</label>
                                <div className="fp-input-wrap">
                                    {/* <span className="fp-input-icon">
                                        <Phone size={14} />
                                    </span> */}
                                    <input
                                        type="tel"
                                        className="fp-input"
                                        placeholder="Registered mobile number"
                                        value={phone}
                                        onChange={(e) =>
                                            setPhone(e.target.value)
                                        }
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            <button
                                className="fp-btn fp-btn-outline"
                                onClick={sendOtp}
                                disabled={loading || phone.length !== 10}
                            >
                                {loading && !sessionId
                                    ? "Sending..."
                                    : "Send OTP"}
                            </button>

                            {/* OTP */}
                            {sessionId && (
                                <>
                                    <div
                                        className="fp-field"
                                        style={{ marginTop: 6 }}
                                    >
                                        <label
                                            className="fp-label"
                                            style={{
                                                textAlign: "center",
                                                display: "block",
                                            }}
                                        >
                                            Enter OTP
                                        </label>
                                        <div className="fp-otp-wrap">
                                            {otp
                                                .split("")
                                                .concat(Array(6).fill(""))
                                                .slice(0, 6)
                                                .map((digit, i) => (
                                                    <input
                                                        key={i}
                                                        type="text"
                                                        maxLength={1}
                                                        className="fp-otp-box"
                                                        value={digit || ""}
                                                        onChange={(e) => {
                                                            const val =
                                                                e.target.value.replace(
                                                                    /\D/g,
                                                                    "",
                                                                );
                                                            if (!val) return;
                                                            const newOtp =
                                                                otp.split("");
                                                            newOtp[i] = val;
                                                            setOtp(
                                                                newOtp
                                                                    .join("")
                                                                    .slice(
                                                                        0,
                                                                        6,
                                                                    ),
                                                            );
                                                            const next =
                                                                e.target
                                                                    .nextSibling;
                                                            if (next)
                                                                next.focus();
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                "Backspace"
                                                            ) {
                                                                const newOtp =
                                                                    otp.split(
                                                                        "",
                                                                    );
                                                                newOtp[i] = "";
                                                                setOtp(
                                                                    newOtp.join(
                                                                        "",
                                                                    ),
                                                                );
                                                                const prev =
                                                                    e.target
                                                                        .previousSibling;
                                                                if (prev)
                                                                    prev.focus();
                                                            }
                                                        }}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                    <button
                                        className="fp-btn fp-btn-primary"
                                        onClick={verifyOtp}
                                        disabled={otp.length !== 6 || loading}
                                    >
                                        <ShieldCheck size={14} />
                                        {loading
                                            ? "Verifying..."
                                            : "Verify OTP"}
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="fp-field">
                                <label className="fp-label">New Password</label>
                                <input
                                    type="password"
                                    className="fp-input no-icon"
                                    placeholder="Create new password"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                />
                            </div>
                            <div className="fp-field">
                                <label className="fp-label">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    className="fp-input no-icon"
                                    placeholder="Repeat new password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                />
                            </div>
                            <button
                                className="fp-btn fp-btn-primary"
                                onClick={resetPassword}
                                disabled={loading}
                                style={{ marginTop: 8 }}
                            >
                                <KeyRound size={14} />
                                {loading ? "Updating..." : "Reset Password"}
                            </button>
                        </>
                    )}

                    <div className="fp-divider" />

                    <Link to="/login" className="fp-back">
                        <ArrowLeft size={13} /> Back to Login
                    </Link>
                </div>
            </div>
        </>
    );
}
