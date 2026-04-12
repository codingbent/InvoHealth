import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";
import {
    ShieldCheck,
    KeyRound,
    ArrowLeft,
    Mail,
    Eye,
    EyeOff,
    Check,
} from "lucide-react";

export default function ForgotPassword(props) {
    const navigate = useNavigate();

    // Steps: 1 = enter email, 2 = enter OTP, 3 = reset password
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [showCpw, setShowCpw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailError, setEmailError] = useState("");
    const [otpError, setOtpError] = useState("");
    const [pwError, setPwError] = useState("");
    const otpRefs = useRef([]);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

    /* ── Step 1: Send OTP to email ── */
    const sendOtp = async () => {
        
        if (!isValidEmail(email)) {
            setEmailError("Enter a valid email address");
            return;
        }
        setEmailError("");
        setLoading(true);
        try {
            console.log(API_BASE_URL);
            
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/send`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email }),
                },
            );
            const data = await res.json();
            if (data.success) {
                setStep(2);
                props.showAlert(
                    "Verification code sent to " + email,
                    "success",
                );
            } else {
                setEmailError(data.error || "Failed to send code. Try again.");
            }
        } catch {
            setEmailError("Server error. Try again later.");
        } finally {
            setLoading(false);
        }
    };

    /* ── Step 2: Verify OTP ── */
    const verifyOtp = async () => {
        const entered = otp.join("");
        if (entered.length !== 6) {
            setOtpError("Enter the complete 6-digit code");
            return;
        }
        setOtpError("");
        setLoading(true);
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/verify`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, otp: entered }),
                },
            );
            const data = await res.json();
            if (data.success) {
                setStep(3);
            } else {
                setOtpError(data.error || "Incorrect code. Try again.");
            }
        } catch {
            setOtpError("Verification failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    /* ── Step 3: Reset password ── */
    const resetPassword = async () => {
        setPwError("");
        if (newPassword.length < 8) {
            setPwError("Password must be at least 8 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwError("Passwords do not match");
            return;
        }
        setLoading(true);
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/reset-password`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, newPassword }),
                },
            );
            const data = await res.json();
            if (data.success) {
                props.showAlert("Password reset successfully!", "success");
                setTimeout(() => navigate("/login"), 1200);
            } else {
                setPwError(data.error || "Reset failed. Try again.");
            }
        } catch {
            setPwError("Server error. Try again.");
        } finally {
            setLoading(false);
        }
    };

    /* ── OTP input helpers ── */
    const handleOtpInput = (i, val) => {
        val = val.replace(/\D/g, "").slice(0, 1);
        const next = [...otp];
        next[i] = val;
        setOtp(next);
        if (val && i < 5) otpRefs.current[i + 1]?.focus();
    };

    const handleOtpKeyDown = (i, e) => {
        if (e.key === "Backspace" && !otp[i] && i > 0)
            otpRefs.current[i - 1]?.focus();
    };

    const resendOtp = async () => {
        setOtp(["", "", "", "", "", ""]);
        setOtpError("");
        await sendOtp();
    };

    /* ── Step metadata ── */
    const STEPS = [{ label: "Email" }, { label: "Verify" }, { label: "Reset" }];

    return (
        <div className="fp-root">
            <div className="fp-card">
                {/* ── Step bar ── */}
                <div className="fp-stepbar">
                    {STEPS.map((s, i) => {
                        const num = i + 1;
                        const done = num < step;
                        const active = num === step;
                        return (
                            <div key={s.label} className="fp-step-wrap">
                                <div className="fp-step-row">
                                    <div
                                        className={`fp-step-dot${done ? " done" : active ? " active" : ""}`}
                                    >
                                        {done ? <Check size={10} /> : num}
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div
                                            className={`fp-step-line${done ? " done" : ""}`}
                                        />
                                    )}
                                </div>
                                <span
                                    className={`fp-step-label${done ? " done" : active ? " active" : ""}`}
                                >
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* ── Header ── */}
                <div className="fp-header">
                    <div className={`fp-icon${step === 3 ? " verified" : ""}`}>
                        {step === 3 ? (
                            <KeyRound size={20} />
                        ) : step === 2 ? (
                            <ShieldCheck size={20} />
                        ) : (
                            <Mail size={20} />
                        )}
                    </div>
                    <h1 className="fp-title">
                        {step === 1 && (
                            <>
                                Forgot <em>Password</em>
                            </>
                        )}
                        {step === 2 && (
                            <>
                                Verify <em>Email</em>
                            </>
                        )}
                        {step === 3 && (
                            <>
                                Reset <em>Password</em>
                            </>
                        )}
                    </h1>
                    <p className="fp-subtitle">
                        {step === 1 &&
                            "Enter your registered email to receive a verification code"}
                        {step === 2 && (
                            <>
                                Code sent to{" "}
                                <strong style={{ color: "#60a5fa" }}>
                                    {email}
                                </strong>
                            </>
                        )}
                        {step === 3 &&
                            "Create a new secure password for your account"}
                    </p>
                </div>

                {/* ── Step 1: Email ── */}
                {step === 1 && (
                    <div className="fp-body">
                        <div className="fp-field">
                            <label className="fp-label">Email Address</label>
                            <div className="fp-input-wrap">
                                <span className="fp-input-icon">
                                    <Mail size={14} />
                                </span>
                                <input
                                    type="email"
                                    className={`fp-input${emailError ? " fp-input-err" : ""}`}
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError("");
                                    }}
                                    onKeyDown={(e) =>
                                        e.key === "Enter" && sendOtp()
                                    }
                                />
                            </div>
                            {emailError && (
                                <span className="fp-errtip">{emailError}</span>
                            )}
                        </div>

                        <button
                            className="fp-btn fp-btn-primary"
                            onClick={sendOtp}
                            disabled={loading || !email}
                        >
                            <Mail size={14} />
                            {loading ? "Sending..." : "Send Verification Code"}
                        </button>
                    </div>
                )}

                {/* ── Step 2: OTP ── */}
                {step === 2 && (
                    <div className="fp-body">
                        <div className="fp-field">
                            <label
                                className="fp-label"
                                style={{
                                    textAlign: "center",
                                    display: "block",
                                }}
                            >
                                Enter 6-digit code
                            </label>
                            <div className="fp-otp-wrap">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className="fp-otp-box"
                                        value={digit}
                                        onChange={(e) =>
                                            handleOtpInput(i, e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            handleOtpKeyDown(i, e)
                                        }
                                    />
                                ))}
                            </div>
                            {otpError && (
                                <span
                                    className="fp-errtip"
                                    style={{
                                        textAlign: "center",
                                        display: "block",
                                    }}
                                >
                                    {otpError}
                                </span>
                            )}
                        </div>

                        <button
                            className="fp-btn fp-btn-primary"
                            onClick={verifyOtp}
                            disabled={otp.join("").length !== 6 || loading}
                        >
                            <ShieldCheck size={14} />
                            {loading ? "Verifying..." : "Verify Code"}
                        </button>

                        <div className="fp-resend-row">
                            Didn't receive it?{" "}
                            <button
                                type="button"
                                className="fp-resend-btn"
                                onClick={resendOtp}
                                disabled={loading}
                            >
                                Resend code
                            </button>{" "}
                            ·{" "}
                            <button
                                type="button"
                                className="fp-resend-btn"
                                onClick={() => {
                                    setStep(1);
                                    setOtp(["", "", "", "", "", ""]);
                                    setOtpError("");
                                }}
                            >
                                Change email
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: New Password ── */}
                {step === 3 && (
                    <div className="fp-body">
                        <div className="fp-field">
                            <label className="fp-label">New Password</label>
                            <div className="fp-input-wrap">
                                <input
                                    type={showPw ? "text" : "password"}
                                    className={`fp-input fp-input-noicon fp-input-eye${pwError ? " fp-input-err" : ""}`}
                                    placeholder="Create new password"
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        if (pwError) setPwError("");
                                    }}
                                />
                                <button
                                    type="button"
                                    className="fp-eye-btn"
                                    onClick={() => setShowPw((p) => !p)}
                                >
                                    {showPw ? (
                                        <EyeOff size={14} />
                                    ) : (
                                        <Eye size={14} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="fp-field">
                            <label className="fp-label">Confirm Password</label>
                            <div className="fp-input-wrap">
                                <input
                                    type={showCpw ? "text" : "password"}
                                    className={`fp-input fp-input-noicon fp-input-eye${pwError ? " fp-input-err" : ""}`}
                                    placeholder="Repeat new password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (pwError) setPwError("");
                                    }}
                                />
                                <button
                                    type="button"
                                    className="fp-eye-btn"
                                    onClick={() => setShowCpw((p) => !p)}
                                >
                                    {showCpw ? (
                                        <EyeOff size={14} />
                                    ) : (
                                        <Eye size={14} />
                                    )}
                                </button>
                            </div>
                            {pwError && (
                                <span className="fp-errtip">{pwError}</span>
                            )}
                        </div>

                        {/* Password match indicator */}
                        {confirmPassword && (
                            <div
                                className={`fp-match-hint${newPassword === confirmPassword ? " ok" : ""}`}
                            >
                                {newPassword === confirmPassword ? (
                                    <>
                                        <Check size={11} /> Passwords match
                                    </>
                                ) : (
                                    "Passwords do not match yet"
                                )}
                            </div>
                        )}

                        <button
                            className="fp-btn fp-btn-primary"
                            onClick={resetPassword}
                            disabled={
                                loading || !newPassword || !confirmPassword
                            }
                            style={{ marginTop: 8 }}
                        >
                            <KeyRound size={14} />
                            {loading ? "Updating..." : "Reset Password"}
                        </button>
                    </div>
                )}

                <div className="fp-divider" />

                <Link to="/login" className="fp-back">
                    <ArrowLeft size={13} /> Back to Login
                </Link>
            </div>
        </div>
    );
}
