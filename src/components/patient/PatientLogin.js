import { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePatient } from "../../context/PatientContext";
import { API_BASE_URL } from "../config";
import "../../css/patient/PatientLogin.css";

export default function PatientLogin({ showAlert }) {
    const navigate = useNavigate();
    const { login } = usePatient();

    // step: "phone" | "otp"
    const [step, setStep] = useState("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);

    /* ── Send OTP ─────────────────────────────────────────────────────────── */
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((c) => c - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSendOtp = async (e) => {
        e.preventDefault();

        if (cooldown > 0) return; // 🚫 block spam

        if (!email.trim()) return showAlert("Enter your Email", "warning");

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/patient/send_otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim() }),
            });

            const data = await res.json();

            if (data.success) {
                setStep("otp");

                // ⏱ start cooldown (30 sec)
                setCooldown(30);
            } else {
                showAlert(data.error || "Failed to send OTP", "danger");
            }
        } catch {
            showAlert("Connection error", "danger");
        } finally {
            setLoading(false);
        }
    };

    /* ── Verify OTP ───────────────────────────────────────────────────────── */
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp.trim()) return showAlert("Enter OTP", "warning");

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/patient/verify_otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim(),
                    otp: otp.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                showAlert(data.error || data.message || "Error", "danger");
                return;
            }
            /* MULTIPLE PATIENTS */
            if (data.selectPatient) {
                localStorage.setItem(
                    "patient_list",
                    JSON.stringify(data.patients),
                );
                return navigate("/patient/select", {
                    state: { patients: data.patients },
                });
            }

            /* SINGLE PATIENT */
            if (data.success) {
                login(data.token, data.patient);
                return navigate("/patient");
            }
            showAlert(data.message || "Invalid OTP", "danger");
        } catch {
            showAlert("Server error", "danger");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pln-root">
            {/* Decorative backgrounds */}
            <div className="pln-bg-grid" aria-hidden="true" />
            <div className="pln-bg-glow" aria-hidden="true" />

            <div className="pln-layout">
                {/* ── LEFT: Landing / hero ─────────────────────────────────── */}
                <div className="pln-left">
                    <h1 className="pln-headline">
                        Your health records,
                        <br />
                        <span className="pln-headline-accent">
                            always with you.
                        </span>
                    </h1>

                    <p className="pln-sub">
                        View appointments, invoices, and stay connected with
                        every doctor you visit — all in one place.
                    </p>

                    {/* Trust badges */}
                    <div className="pln-trust">
                        <span className="pln-trust-item">
                            <span className="pln-trust-icon">🔒</span>
                            End-to-end encrypted
                        </span>
                        <span className="pln-trust-sep" />
                        <span className="pln-trust-item">
                            <span className="pln-trust-icon">📄</span>
                            Instant PDF invoices
                        </span>
                        <span className="pln-trust-sep" />
                        <span className="pln-trust-item">
                            <span className="pln-trust-icon">🏥</span>
                            Multi-clinic support
                        </span>
                    </div>

                    {/* Feature list */}
                    <div className="pln-feat-list">
                        <div className="pln-feat-item">
                            <span className="pln-feat-dot pln-feat-dot--blue" />
                            <div>
                                <div className="pln-feat-title">
                                    Full medical history
                                </div>
                                <div className="pln-feat-desc">
                                    Every visit and invoice, across all your
                                    doctors.
                                </div>
                            </div>
                        </div>
                        <div className="pln-feat-item">
                            <span className="pln-feat-dot pln-feat-dot--teal" />
                            <div>
                                <div className="pln-feat-title">
                                    Instant invoice access
                                </div>
                                <div className="pln-feat-desc">
                                    Download PDF invoices any time, from any
                                    device.
                                </div>
                            </div>
                        </div>
                        <div className="pln-feat-item">
                            <span className="pln-feat-dot pln-feat-dot--purple" />
                            <div>
                                <div className="pln-feat-title">
                                    Multi-doctor support
                                </div>
                                <div className="pln-feat-desc">
                                    One account linked to every clinic you
                                    visit.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating mock card — decorative */}
                    <div className="pln-mockup" aria-hidden="true">
                        <div className="pln-mock-card">
                            <div className="pln-mock-header">
                                <div className="pln-mock-avatar">A</div>
                                <div>
                                    <div className="pln-mock-name">
                                        Dr. Arjun Mehta
                                    </div>
                                    <div className="pln-mock-spec">
                                        Orthopedics · MBBS, MS
                                    </div>
                                </div>
                                <div className="pln-mock-badge">Active</div>
                            </div>
                            <div className="pln-mock-divider" />
                            <div className="pln-mock-row">
                                <span className="pln-mock-label">
                                    Last visit
                                </span>
                                <span className="pln-mock-val">24 Apr 2025</span>
                            </div>
                            <div className="pln-mock-row">
                                <span className="pln-mock-label">Invoice</span>
                                <span className="pln-mock-val pln-mock-inv">
                                    #INV-042 · ₹1,200
                                </span>
                            </div>
                            <div className="pln-mock-row">
                                <span className="pln-mock-label">Status</span>
                                <span className="pln-mock-paid">Paid</span>
                            </div>
                        </div>
                        <div className="pln-mock-card-back" />
                    </div>
                </div>

                {/* ── RIGHT: Login form ─────────────────────────────────────── */}
                <div className="pln-right">
                    <div className="pln-form-card">
                        {/* Brand mark — visible on mobile only (desktop has left panel) */}
                        <div className="pln-form-brand">
                            <span className="pln-brand-icon">⚕</span>
                            <span className="pln-brand-text">
                                Invo<em>Health</em>
                            </span>
                        </div>

                        <h2 className="pln-form-title">
                            {step === "email"
                                ? "Sign in to your account"
                                : "Enter OTP"}
                        </h2>
                        <p className="pln-form-sub">
                            {step === "email"
                                ? "Enter your registered email to receive a one-time password."
                                : `We sent a 6-digit code to ${email}. Check your messages.`}
                        </p>

                        {/* Phone step */}
                        {step === "email" && (
                            <form
                                onSubmit={handleSendOtp}
                                className="pln-form"
                                noValidate
                            >
                                <div className="pln-field">
                                    <label
                                        className="pln-label"
                                        htmlFor="pln-phone"
                                    >
                                        Email
                                    </label>
                                    <input
                                        id="pln-phone"
                                        className="pln-input"
                                        type="email"
                                        placeholder="name@email.com"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="pln-btn-submit"
                                    disabled={loading || cooldown > 0}
                                >
                                    {cooldown > 0
                                        ? `Wait ${cooldown}s`
                                        : "Send OTP →"}
                                </button>
                            </form>
                        )}

                        {/* OTP step */}
                        {step === "otp" && (
                            <form
                                onSubmit={handleVerifyOtp}
                                className="pln-form"
                                noValidate
                            >
                                <div className="pln-field">
                                    <label
                                        className="pln-label"
                                        htmlFor="pln-otp"
                                    >
                                        One-time password
                                    </label>
                                    <input
                                        id="pln-otp"
                                        className="pln-input pln-input-otp"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="------"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) =>
                                            setOtp(
                                                e.target.value.replace(
                                                    /\D/g,
                                                    "",
                                                ),
                                            )
                                        }
                                        autoFocus
                                        autoComplete="one-time-code"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="pln-btn-submit"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="pln-spinner" />
                                    ) : (
                                        "Verify & sign in →"
                                    )}
                                </button>

                                <button
                                    type="button"
                                    className="pln-btn-back"
                                    onClick={() => {
                                        setStep("email");
                                        setOtp("");
                                    }}
                                >
                                    ← Change Email
                                </button>
                            </form>
                        )}

                        <p className="pln-form-hint">
                            Your account is created by your doctor after your
                            first visit. Use the email you provided at
                            the clinic.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
