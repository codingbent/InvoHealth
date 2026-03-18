import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authFetch } from "./authfetch";
import { Stethoscope, Users, LogIn, UserPlus } from "lucide-react";

export default function Login(props) {
    const navigate = useNavigate();

    // ================= STATES =================
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loginAs, setLoginAs] = useState("doctor");
    const [inputType, setInputType] = useState("typing");
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

    // ================= VALIDATE EMAIL / PHONE =================
    const handleIdentifierChange = (e) => {
        let value = e.target.value;

        if (loginAs === "staff") {
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
            body: JSON.stringify({
                phone: identifier,
                password,
            }),
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
                <div className="btn-group justify-content-around w-100 mb-3">
                    <div className="role-toggle">
                        <button
                            type="button"
                            className={`role-btn ${loginAs === "doctor" ? "active" : ""}`}
                            onClick={() => setLoginAs("doctor")}
                        >
                            <Stethoscope size={16} />
                            Doctor
                        </button>

                        <button
                            type="button"
                            className={`role-btn ${loginAs === "staff" ? "active" : ""}`}
                            onClick={() => setLoginAs("staff")}
                        >
                            <Users size={16} />
                            Staff
                        </button>
                    </div>
                </div>

                {/* IDENTIFIER */}
                <div className="mb-3">
                    <label className="form-label">
                        {loginAs === "staff"
                            ? "Phone Number"
                            : "Email or Phone"}
                    </label>

                    <div className={loginAs === "staff" ? "input-group" : ""}>
                        {loginAs === "staff" && (
                            <span className="input-group-text">+91</span>
                        )}

                        <input
                            type={loginAs === "staff" ? "tel" : "text"}
                            className="form-control"
                            placeholder={
                                loginAs === "staff"
                                    ? "Enter 10-digit phone number"
                                    : "Enter email or phone"
                            }
                            value={identifier}
                            maxLength={loginAs === "staff" ? 10 : undefined}
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

                <div className="text-end mt-2">
                    <Link
                        to="/forgot-password"
                        className="text-decoration-none text-primary small fw-medium"
                    >
                        Forgot your password?
                    </Link>
                </div>

                <button type="submit" className="btn btn-primary w-100 mt-2">
                    <LogIn size={18} />
                    Login
                </button>

                {/* FOOTER */}
                <div className="text-center mt-3">
                    <span className="text-theme-secondary">New user? </span>
                    <UserPlus size={18} />
                    <Link to="/signup">Create an account</Link>
                </div>
            </form>
        </div>
    );
}
