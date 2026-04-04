import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authFetch } from "./authfetch";
import { Stethoscope, Users, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";

export default function Login(props) {
    const navigate = useNavigate();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loginAs, setLoginAs] = useState("doctor");
    const [inputType, setInputType] = useState("typing");
    const [showInvalid, setShowInvalid] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    useEffect(() => {
        if (inputType !== "invalid") {
            setShowInvalid(false);
            return;
        }
        const timer = setTimeout(() => setShowInvalid(true), 500);
        return () => clearTimeout(timer);
    }, [inputType]);

    const handleIdentifierChange = (e) => {
        let value = e.target.value;
        if (loginAs === "staff") value = value.replace(/\D/g, "");
        setIdentifier(value);
        if (!value || value.length < 4) {
            setInputType("typing");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[6-9]\d{9}$/;
        if (emailRegex.test(value)) setInputType("email");
        else if (phoneRegex.test(value)) setInputType("phone");
        else setInputType("invalid");
    };

    const getIdentifierTypeForApi = () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[6-9]\d{9}$/;
        if (emailRegex.test(identifier)) return "email";
        if (phoneRegex.test(identifier)) return "phone";
        return null;
    };

    const loginWithPassword = async () => {
        const identifierTypeForApi = getIdentifierTypeForApi();
        if (!identifierTypeForApi) {
            props.showAlert("Enter a valid email or phone number", "danger");
            return;
        }
        const res = await fetch(`${API_BASE_URL}/api/doctor/login_doctor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                identifier,
                password,
                loginType: "password",
                identifierType: identifierTypeForApi,
            }),
        });
        const json = await res.json();
        if (json.success) {
            localStorage.setItem("token", json.authtoken);
            localStorage.setItem("name", json.name);
            localStorage.setItem("role", json.role);
            localStorage.setItem("plan", json.subscription?.plan || "free");
            navigate("/");
        } else {
            props.showAlert(json.error || "Login failed", "danger");
        }
    };

    const staffLogin = async () => {
        const res = await authFetch(`${API_BASE_URL}/api/staff/login_staff`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: identifier, password }),
        });
        if (!res) {
            props.showAlert("Session expired. Login again.", "danger");
            return;
        }
        const data = await res.json();
        if (data.firstLogin) {
            navigate("/set-staff-password", {
                state: { staffId: data.staffId },
            });
            return;
        }
        if (data.success) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("name", data.name);
            localStorage.setItem("role", data.role);
            navigate("/");
        } else {
            props.showAlert(data?.error || "Login failed", "danger");
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const identifierTypeForApi = getIdentifierTypeForApi();
        if (!identifierTypeForApi) {
            alert("Enter a valid email or phone number");
            return;
        }
        if (loginAs === "staff") {
            if (identifierTypeForApi !== "phone") {
                alert("Login using phone number");
                return;
            }
            staffLogin();
            return;
        }
        loginWithPassword();
    };

    return (
        <>
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
                            onClick={() => setLoginAs("doctor")}
                        >
                            <Stethoscope size={14} /> Doctor
                        </button>
                        <button
                            type="button"
                            className={`lg-role-btn ${loginAs === "staff" ? "active" : ""}`}
                            onClick={() => setLoginAs("staff")}
                        >
                            <Users size={14} /> Staff
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Identifier */}
                        <div className="lg-field">
                            <label className="lg-label">
                                {loginAs === "staff"
                                    ? "Phone Number"
                                    : "Email or Phone"}
                            </label>
                            <div className="lg-input-wrap">
                                {loginAs === "staff" && (
                                    <span className="lg-prefix">+91</span>
                                )}
                                <input
                                    type={loginAs === "staff" ? "tel" : "text"}
                                    className={`lg-input${loginAs === "staff" ? " has-prefix" : ""}${showInvalid ? " invalid" : ""}`}
                                    placeholder={
                                        loginAs === "staff"
                                            ? "10-digit phone number"
                                            : "Email or phone"
                                    }
                                    value={identifier}
                                    maxLength={
                                        loginAs === "staff" ? 10 : undefined
                                    }
                                    onChange={handleIdentifierChange}
                                    required
                                />
                            </div>
                            {showInvalid && (
                                <div className="lg-error">
                                    Enter a valid email or phone number
                                </div>
                            )}
                        </div>

                        {loginAs === "staff" && (
                            <div className="lg-forgot">
                                First time logging in? Just enter your number
                                and password to continue.
                            </div>
                        )}

                        {/* Password */}
                        <div className="lg-field">
                            <label className="lg-label">Password</label>
                            <div className="lg-input-wrap">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="lg-input has-eye"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
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
                        <button type="submit" className="lg-submit">
                            <LogIn size={15} />
                            Sign In
                        </button>
                    </form>

                    {/* Footer */}
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
        </>
    );
}
