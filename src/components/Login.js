import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authFetch } from "./authfetch";

export default function Login(props) {
    const navigate = useNavigate();

    // ================= STATES =================
    const [identifier, setIdentifier] = useState("");
    const [otp, setOtp] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [password, setPassword] = useState("");
    const [isOtpLogin, setIsOtpLogin] = useState(false);
    const [inputType, setInputType] = useState("typing");
    const [loginAs, setLoginAs] = useState("doctor");
    const [showInvalid, setShowInvalid] = useState(false);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    useEffect(() => {
        if (inputType !== "invalid") {
            setShowInvalid(false);
            return;
        }

        const timer = setTimeout(() => {
            setShowInvalid(true);
        }, 500);

        return () => clearTimeout(timer);
    }, [inputType]);
    const applyTheme = (theme) => {
        const finalTheme = theme || "light";

        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add(`${finalTheme}-theme`);

        localStorage.setItem("theme", finalTheme);
    };

    // ================= VALIDATE EMAIL / PHONE =================
    const handleIdentifierChange = (e) => {
        let value = e.target.value;

        // 🔒 Restrict to digits for staff / OTP
        if (loginAs === "staff" || isOtpLogin) {
            value = value.replace(/\D/g, "");
        }

        setIdentifier(value);

        if (!value || value.length < 4) {
            setInputType("typing");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^[6-9]\d{9}$/;

        if (emailRegex.test(value)) {
            setInputType("email");
        } else if (phoneRegex.test(value)) {
            setInputType("phone");
        } else {
            setInputType("invalid");
        }
    };

    const sendOtp = async () => {
        const res = await authFetch(`${API_BASE_URL}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: identifier }),
        });

        const data = await res.json();
        if (data.success) {
            setSessionId(data.sessionId);
            props.showAlert("OTP sent", "success");
        } else {
            props.showAlert(data.error, "danger");
        }
    };

    const verifyOtp = async () => {
        const res = await authFetch(`${API_BASE_URL}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: identifier,
                otp,
                sessionId,
            }),
        });

        const data = await res.json();

        if (data.success) {
            localStorage.setItem("token", data.authtoken);
            localStorage.setItem("name", data.name);
            localStorage.setItem("role", data.role);
            applyTheme(data.theme);
            navigate("/");
        } else {
            alert(data.error);
        }
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

        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
            applyTheme(json.theme);
            navigate("/");
        } else {
            props.showAlert(json.error || "Login failed", "danger");
        }
    };

    const staffLogin = async () => {
        const res = await authFetch(`${API_BASE_URL}/api/auth/staff/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: identifier,
                password,
            }),
        });

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
            applyTheme(data.theme);
            navigate("/");
        } else {
            alert(data.error);
        }
    };

    useEffect(() => {
        if (loginAs === "staff") {
            setIsOtpLogin(false);
        }
    }, [loginAs]);
    // ================= FORM SUBMIT =================
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
        <div className="container mt-5" style={{ maxWidth: "420px" }}>
            <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                <h4 className="text-center mb-4 fw-semibold">Login</h4>
                <div className="btn-group w-100 mb-3">
                    <button
                        type="button"
                        className={`btn ${
                            loginAs === "doctor"
                                ? "btn-primary"
                                : "btn-outline-primary"
                        }`}
                        onClick={() => setLoginAs("doctor")}
                    >
                        Doctor
                    </button>

                    <button
                        type="button"
                        className={`btn ${
                            loginAs === "staff"
                                ? "btn-primary"
                                : "btn-outline-primary"
                        }`}
                        onClick={() => setLoginAs("staff")}
                    >
                        Staff
                    </button>
                </div>

                {/* IDENTIFIER (shown always) */}
                <div className="mb-3">
                    <label className="form-label">
                        {loginAs === "staff"
                            ? "Phone Number"
                            : isOtpLogin
                            ? "Phone Number"
                            : "Email or Phone"}
                    </label>

                    <div
                        className={
                            loginAs === "staff" || isOtpLogin
                                ? "input-group"
                                : ""
                        }
                    >
                        {(loginAs === "staff" || isOtpLogin) && (
                            <span className="input-group-text">🇮🇳 +91</span>
                        )}

                        <input
                            type={
                                loginAs === "staff" || isOtpLogin
                                    ? "tel"
                                    : "text"
                            }
                            inputMode={
                                loginAs === "staff" || isOtpLogin
                                    ? "numeric"
                                    : "text"
                            }
                            pattern={
                                loginAs === "staff" || isOtpLogin
                                    ? "[0-9]{10}"
                                    : undefined
                            }
                            className="form-control"
                            placeholder={
                                loginAs === "staff" || isOtpLogin
                                    ? "Enter 10-digit phone number"
                                    : "Enter email or phone"
                            }
                            value={identifier}
                            maxLength={
                                loginAs === "staff" || isOtpLogin
                                    ? 10
                                    : undefined
                            }
                            onWheel={(e) => e.target.blur()}
                            onChange={handleIdentifierChange}
                            required
                        />
                    </div>

                    {showInvalid && (
                        <small className="text-danger">
                            Enter a valid email or phone number
                        </small>
                    )}
                </div>

                {/* SWITCH */}
                {loginAs === "doctor" && (
                    <div className="form-check form-switch mb-3">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={isOtpLogin}
                            onChange={(e) => setIsOtpLogin(e.target.checked)}
                        />
                        <label className="form-check-label">
                            Login with {isOtpLogin ? "OTP" : "Password"}
                        </label>
                    </div>
                )}

                {/* PASSWORD LOGIN */}
                {!isOtpLogin && (
                    <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                )}

                {!isOtpLogin && (
                    <div className="text-end mt-2">
                        <Link
                            to="/forgot-password"
                            className="text-decoration-none text-primary small fw-medium"
                        >
                            Forgot your password?
                        </Link>
                    </div>
                )}

                {/* OTP LOGIN */}
                {loginAs === "doctor" && isOtpLogin && (
                    <div className="border rounded-3 p-3 bg-light mb-3">
                        {/* Send OTP */}
                        <button
                            type="button"
                            className="btn btn-outline-primary w-100 mb-3"
                            onClick={sendOtp}
                            disabled={inputType !== "phone"}
                        >
                            📤 Send OTP
                        </button>

                        {/* OTP INPUT */}
                        <div className="mb-3">
                            <label className="form-label text-center w-100">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                className="form-control text-center fs-5 letter-spacing"
                                placeholder="● ● ● ● ● ●"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>

                        {/* VERIFY */}
                        <button
                            type="button"
                            className="btn btn-success w-100"
                            onClick={verifyOtp}
                            disabled={otp.length !== 6}
                        >
                            ✅ Verify OTP
                        </button>
                    </div>
                )}

                {/* SUBMIT BUTTON (PASSWORD ONLY) */}
                {!isOtpLogin && (
                    <button
                        type="submit"
                        className="btn btn-primary w-100 mt-2"
                    >
                        Login
                    </button>
                )}

                {/* FOOTER */}
                <div className="text-center mt-3">
                    <span>New user? </span>
                    <Link to="/signup">Create an account</Link>
                </div>
            </form>
        </div>
    );
}
