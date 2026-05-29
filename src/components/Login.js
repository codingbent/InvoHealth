import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authFetch, AuthError, SubscriptionError } from "./authfetch";
import { Stethoscope, Users, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchCountries } from "../api/country.api";
import "../css/Login.css";

export default function Login(props) {
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loginAs, setLoginAs] = useState("doctor");
    const [countryCode, setCountryCode] = useState("");
    const [countries, setCountries] = useState([]);
    const [showInvalid, setShowInvalid] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleSetRole = (role) => {
        setLoginAs(role);
        setIdentifier("");
        setShowInvalid(false);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchCountries();
                setCountries(data);

                // Default to India's dial code
                const india = data.find((c) => c.dialCode === "+91");
                if (india) setCountryCode(india.dialCode);
            } catch {
                setCountries([{ dialCode: "+91", code: "IN", flag: "🇮🇳" }]); // fallback
            }
        };

        load();
    }, []);

    const validate = () => {
        if (loginAs === "doctor")
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
        return /^\d{7,14}$/.test(identifier.replace(/\D/g, ""));
    };

    // const getFullPhone = () => countryCode + identifier.replace(/\D/g, "");

    const loginWithPassword = async () => {
        try {
            setIsSigningIn(true);

            const res = await fetch(`${API_BASE_URL}/api/doctor/login_doctor`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    identifier,
                    password,
                    identifierType: "email",
                }),
            });

            const json = await res.json();

            if (json.success) {
                localStorage.setItem("token", json.authtoken);
                localStorage.setItem("name", json.name);
                localStorage.setItem("role", json.role);

                window.location.href = "/";
            } else {
                props.showAlert(json.error || "Login failed", "danger");
            }
        } finally {
            setIsSigningIn(false);
        }
    };

    const staffLogin = async () => {
        try {
            const cleanPhone = identifier.replace(/\D/g, "").replace(/^0+/, "");
            if (!cleanPhone || !password) {
                props.showAlert("Enter phone and password", "danger");
                return;
            }
            setIsSigningIn(true);

            const res = await authFetch(
                `${API_BASE_URL}/api/staff/login_staff`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        phone: cleanPhone,
                        dialCode: countryCode,
                        password,
                    }),
                },
            );

            const data = await res.json();

            // FIRST LOGIN
            if (data.firstLogin) {
                navigate(`/set-staff-password?token=${data.setupToken}`);
                return;
            }

            // SUCCESS
            if (data.success) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("name", data.name);
                localStorage.setItem("role", "staff");
                localStorage.setItem("staffRole", data.role);
                window.location.href = "/";
            }
        } catch (err) {
            console.error("Staff login error:", err);

            // AUTH ERRORS
            if (err instanceof AuthError) {
                props.showAlert(err.message || "Session expired", "danger");
                return;
            }

            // SUBSCRIPTION
            if (err instanceof SubscriptionError) {
                props.showAlert(err.message, "warning");
                return;
            }

            // NORMAL API ERRORS
            if (err instanceof Error) {
                props.showAlert(err.message || "Login failed", "danger");
                return;
            }

            // UNKNOWN
            props.showAlert("Something went wrong. Try again.", "danger");
        } finally {
            setIsSigningIn(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) {
            setShowInvalid(true);
            return;
        }
        if (loginAs === "staff") {
            staffLogin();
            return;
        }
        loginWithPassword();
    };

    return (
        <div className="lg-root">
            <div className="lg-card">
                {/* Header */}
                <div className="lg-header">
                    <div className="lg-logo">
                        <Stethoscope size={22} />
                    </div>
                    <h1 className="lg-title">
                        Welcome <em>back</em>
                    </h1>
                    <div className="lg-subtitle">Sign in to InvoHealth</div>
                </div>

                {/* Role toggle */}
                <div className="lg-role-toggle">
                    <button
                        type="button"
                        className={`lg-role-btn ${loginAs === "doctor" ? "active" : ""}`}
                        onClick={() => handleSetRole("doctor")}
                    >
                        <Stethoscope size={14} /> Doctor
                    </button>
                    <button
                        type="button"
                        className={`lg-role-btn ${loginAs === "staff" ? "active" : ""}`}
                        onClick={() => handleSetRole("staff")}
                    >
                        <Users size={14} /> Staff
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="lg-field">
                        <label className="lg-label">
                            {loginAs === "doctor" ? "Email" : "Phone Number"}
                        </label>

                        <div className="lg-input-wrap">
                            {/* Country code — staff only */}
                            {loginAs === "staff" && (
                                <select
                                    className="lg-country-select"
                                    value={countryCode}
                                    onChange={(e) =>
                                        setCountryCode(e.target.value)
                                    }
                                >
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.dialCode}>
                                            {c.flag} {c.dialCode}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <input
                                type={loginAs === "doctor" ? "email" : "tel"}
                                className={`lg-input${showInvalid ? " invalid" : ""}`}
                                placeholder={
                                    loginAs === "doctor"
                                        ? "Enter your email"
                                        : "10-digit phone number"
                                }
                                value={identifier}
                                maxLength={loginAs === "staff" ? 10 : undefined}
                                onChange={(e) => {
                                    let v = e.target.value;
                                    if (loginAs === "staff")
                                        v = v.replace(/\D/g, "");
                                    setIdentifier(v);
                                    setShowInvalid(false);
                                }}
                                required
                            />
                        </div>

                        {showInvalid && (
                            <div className="lg-error">
                                {loginAs === "doctor"
                                    ? "Enter a valid email address"
                                    : "Enter a valid phone number"}
                            </div>
                        )}

                        {loginAs === "staff" && (
                            <div className="lg-hint">
                                First time logging in? Just enter your number
                                and password as 123456 to continue.
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div className="lg-field">
                        <label className="lg-label">Password</label>
                        <div className="lg-input-wrap">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="lg-input has-eye"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                className="lg-eye-btn"
                                onClick={() => setShowPassword((p) => !p)}
                            >
                                {showPassword ? (
                                    <EyeOff size={16} />
                                ) : (
                                    <Eye size={16} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Forgot */}
                    <Link to="/forgot-password" className="lg-forgot">
                        Forgot your password?
                    </Link>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="lg-submit"
                        disabled={isSigningIn}
                    >
                        {isSigningIn ? (
                            <>
                                <span className="lg-spinner"></span>
                                Signing In...
                            </>
                        ) : (
                            <>
                                <LogIn size={15} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="lg-divider">
                    <div className="lg-divider-line" />
                    <div className="lg-divider-dot" />
                    <div className="lg-divider-line" />
                </div>

                <div className="lg-footer">
                    <span>New to InvoHealth?</span>
                    <Link to="/#pricing" className="lg-footer-link">
                        <UserPlus size={13} /> Create account
                    </Link>
                </div>
            </div>
        </div>
    );
}
