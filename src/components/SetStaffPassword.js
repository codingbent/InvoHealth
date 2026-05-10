import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";
import {
    KeyRound,
    ShieldCheck,
    AlertTriangle,
    Eye,
    EyeOff,
    Check,
    X,
} from "lucide-react";
import { API_BASE_URL } from "./config";
import "../css/Setstaffpassword.css";

export default function SetStaffPassword(props) {
    const navigate = useNavigate();
    const location = useLocation();

    const params = new URLSearchParams(location.search);

    const setupToken = params.get("token");

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [loading, setLoading] = useState(false);

    const [pwChecks, setPwChecks] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
    });

    if (!setupToken) {
        return (
            <div className="ssp-root">
                <div className="ssp-card">
                    <div className="ssp-invalid">
                        <AlertTriangle size={22} style={{ color: "#fb923c" }} />
                        <span>Invalid access. No setup token found.</span>
                    </div>
                </div>
            </div>
        );
    }

    const validatePassword = (val) => {
        setPwChecks({
            length: val.length >= 8,
            upper: /[A-Z]/.test(val),
            lower: /[a-z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[^A-Za-z0-9]/.test(val),
        });
    };

    const passwordsMatch = confirm.length > 0 && password === confirm;

    const submitPassword = async () => {
        if (!Object.values(pwChecks).every(Boolean)) {
            props.showAlert(
                "Password must contain uppercase, lowercase, number and special character",
                "danger",
            );
            return;
        }

        if (!passwordsMatch) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }

        setLoading(true);

        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/staff/set_password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        setupToken,
                        password,
                    }),
                },
            );

            const data = await res.json();

            if (data.success) {
                props.showAlert(
                    "Password set successfully. Please login.",
                    "success",
                );

                navigate("/login");
            } else {
                props.showAlert(data.error || "Something went wrong", "danger");
            }
        } catch (err) {
            console.error(err);

            props.showAlert(
                err.message || "Network error. Try again.",
                "danger",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ssp-root">
            <div className="ssp-card">
                {/* HEADER */}
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

                {/* PASSWORD */}
                <div className="ssp-field">
                    <label className="ssp-label">New Password</label>

                    <div className="ssp-input-wrap">
                        <input
                            type={showPassword ? "text" : "password"}
                            className="ssp-input"
                            placeholder="Create strong password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                validatePassword(e.target.value);
                            }}
                        />

                        <button
                            type="button"
                            className="ssp-eye-btn"
                            onClick={() => setShowPassword((p) => !p)}
                        >
                            {showPassword ? (
                                <EyeOff size={15} />
                            ) : (
                                <Eye size={15} />
                            )}
                        </button>
                    </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div className="ssp-field">
                    <label className="ssp-label">Confirm Password</label>

                    <div className="ssp-input-wrap">
                        <input
                            type={showConfirm ? "text" : "password"}
                            className={`ssp-input ${
                                confirm.length > 0
                                    ? passwordsMatch
                                        ? "ssp-input-ok"
                                        : "ssp-input-error"
                                    : ""
                            }`}
                            placeholder="Repeat password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />

                        <button
                            type="button"
                            className="ssp-eye-btn"
                            onClick={() => setShowConfirm((p) => !p)}
                        >
                            {showConfirm ? (
                                <EyeOff size={15} />
                            ) : (
                                <Eye size={15} />
                            )}
                        </button>
                    </div>

                    {confirm.length > 0 && (
                        <div
                            className="ssp-match-status"
                            style={{
                                color: passwordsMatch ? "#4ade80" : "#f87171",
                            }}
                        >
                            {passwordsMatch ? (
                                <>
                                    <ShieldCheck size={13} />
                                    Passwords match
                                </>
                            ) : (
                                <>
                                    <X size={13} />
                                    Passwords do not match
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* PASSWORD RULES */}
                <div className="ssp-pw-checks">
                    <div
                        className={`ssp-pw-check ${
                            pwChecks.length ? "pass" : "fail"
                        }`}
                    >
                        <span>
                            {pwChecks.length ? (
                                <Check size={11} />
                            ) : (
                                <X size={11} />
                            )}
                        </span>
                        Min 8 characters
                    </div>

                    <div
                        className={`ssp-pw-check ${
                            pwChecks.upper ? "pass" : "fail"
                        }`}
                    >
                        <span>
                            {pwChecks.upper ? (
                                <Check size={11} />
                            ) : (
                                <X size={11} />
                            )}
                        </span>
                        Uppercase letter
                    </div>

                    <div
                        className={`ssp-pw-check ${
                            pwChecks.lower ? "pass" : "fail"
                        }`}
                    >
                        <span>
                            {pwChecks.lower ? (
                                <Check size={11} />
                            ) : (
                                <X size={11} />
                            )}
                        </span>
                        Lowercase letter
                    </div>

                    <div
                        className={`ssp-pw-check ${
                            pwChecks.number ? "pass" : "fail"
                        }`}
                    >
                        <span>
                            {pwChecks.number ? (
                                <Check size={11} />
                            ) : (
                                <X size={11} />
                            )}
                        </span>
                        Number
                    </div>

                    <div
                        className={`ssp-pw-check ${
                            pwChecks.special ? "pass" : "fail"
                        }`}
                    >
                        <span>
                            {pwChecks.special ? (
                                <Check size={11} />
                            ) : (
                                <X size={11} />
                            )}
                        </span>
                        Special character
                    </div>
                </div>

                {/* BUTTON */}
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
    );
}
