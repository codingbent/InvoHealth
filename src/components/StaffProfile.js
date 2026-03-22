import { useEffect, useState } from "react";
import { authFetch } from "./authfetch";
import {
    Lock,
    RefreshCcw,
    Phone,
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
} from "lucide-react";

const API_BASE_URL =
    process.env.NODE_ENV === "production"
        ? "https://gmsc-backend.onrender.com"
        : "http://localhost:5001";

const ROLE_COLORS = {
    receptionist: {
        bg: "rgba(96,165,250,0.1)",
        border: "rgba(96,165,250,0.2)",
        color: "#60a5fa",
    },
    assistant: {
        bg: "rgba(167,139,250,0.1)",
        border: "rgba(167,139,250,0.2)",
        color: "#a78bfa",
    },
    nurse: {
        bg: "rgba(244,114,182,0.1)",
        border: "rgba(244,114,182,0.2)",
        color: "#f472b6",
    },
};

export default function StaffProfile(props) {
    const [staff, setStaff] = useState(null);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [pwOpen, setPwOpen] = useState(false);
    const [show, setShow] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const fetchStaff = async () => {
        const res = await authFetch(`${API_BASE_URL}/api/staff/staff_profile`);
        const data = await res.json();
        if (data.success) setStaff(data.staff);
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleChangePassword = async () => {
        const { currentPassword, newPassword, confirmPassword } = passwordData;
        if (!currentPassword || !newPassword || !confirmPassword) {
            props.showAlert("All fields required", "danger");
            return;
        }
        if (newPassword !== confirmPassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }
        const res = await authFetch(
            `${API_BASE_URL}/api/staff/change_password`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            },
        );
        const data = await res.json();
        if (data.success) {
            props.showAlert("Password updated", "success");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } else
            props.showAlert(
                data.error || "Server Error try again later",
                "danger",
            );
    };

    const passwordsMatch =
        passwordData.newPassword === passwordData.confirmPassword;

    if (!staff)
        return (
            <>
                <style>{`@keyframes sp2-pulse{0%,80%,100%{transform:scale(1);opacity:.4}40%{transform:scale(1.4);opacity:1}}`}</style>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "60vh",
                        gap: 8,
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#2e3d5c",
                                animation: `sp2-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                display: "inline-block",
                            }}
                        />
                    ))}
                </div>
            </>
        );

    const rc = ROLE_COLORS[staff.role?.toLowerCase()] || ROLE_COLORS.assistant;

    return (
        <>
            <div className="sfp-root">
                <div className="sfp-page-title">
                    Staff <em>Profile</em>
                </div>

                {/* Profile card */}
                <div className="sfp-card">
                    <div className="sfp-profile-row">
                        <div className="sfp-left">
                            <div className="sfp-avatar">
                                {staff.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                                <div className="sfp-name">{staff.name}</div>
                                <span
                                    className="sfp-role-badge"
                                    style={{
                                        background: rc.bg,
                                        borderColor: rc.border,
                                        color: rc.color,
                                    }}
                                >
                                    {staff.role}
                                </span>
                            </div>
                        </div>
                        <div className="sfp-phone">
                            <Phone size={13} /> {staff.phone}
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                <div className="sfp-section">
                    <button
                        className="sfp-section-hdr"
                        onClick={() => setPwOpen((p) => !p)}
                    >
                        <span className="sfp-section-icon">
                            <Lock size={14} />
                        </span>
                        <span className="sfp-section-label">
                            Change Password
                        </span>
                        {pwOpen ? (
                            <ChevronUp
                                size={13}
                                style={{ color: "#2e3d5c", marginLeft: "auto" }}
                            />
                        ) : (
                            <ChevronDown
                                size={13}
                                style={{ color: "#2e3d5c", marginLeft: "auto" }}
                            />
                        )}
                    </button>

                    {pwOpen && (
                        <div className="sfp-section-body">
                            <div className="sfp-grid">
                                {[
                                    {
                                        key: "currentPassword",
                                        label: "Current Password",
                                        placeholder: "••••••••",
                                    },
                                    {
                                        key: "newPassword",
                                        label: "New Password",
                                        placeholder: "Min. 6 characters",
                                    },
                                    {
                                        key: "confirmPassword",
                                        label: "Confirm Password",
                                        placeholder: "Re-enter password",
                                    },
                                ].map(({ key, label, placeholder }) => (
                                    <div key={key} className="sfp-field">
                                        <label className="sfp-label">
                                            {label}
                                        </label>
                                        <div className="sfp-input-wrap">
                                            <input
                                                type={
                                                    show[
                                                        key
                                                            .replace(
                                                                "Password",
                                                                "",
                                                            )
                                                            .toLowerCase() ||
                                                            "current"
                                                    ]
                                                        ? "text"
                                                        : "password"
                                                }
                                                className="sfp-input"
                                                placeholder={placeholder}
                                                value={passwordData[key]}
                                                onChange={(e) =>
                                                    setPasswordData({
                                                        ...passwordData,
                                                        [key]: e.target.value,
                                                    })
                                                }
                                            />
                                            <button
                                                type="button"
                                                className="sfp-eye"
                                                onClick={() => {
                                                    const k =
                                                        key ===
                                                        "currentPassword"
                                                            ? "current"
                                                            : key ===
                                                                "newPassword"
                                                              ? "new"
                                                              : "confirm";
                                                    setShow((p) => ({
                                                        ...p,
                                                        [k]: !p[k],
                                                    }));
                                                }}
                                            >
                                                {show[
                                                    key === "currentPassword"
                                                        ? "current"
                                                        : key === "newPassword"
                                                          ? "new"
                                                          : "confirm"
                                                ] ? (
                                                    <EyeOff size={14} />
                                                ) : (
                                                    <Eye size={14} />
                                                )}
                                            </button>
                                        </div>
                                        {key === "confirmPassword" &&
                                            passwordData.confirmPassword && (
                                                <div
                                                    className="sfp-pw-hint"
                                                    style={{
                                                        color: passwordsMatch
                                                            ? "#4ade80"
                                                            : "#f87171",
                                                    }}
                                                >
                                                    {passwordsMatch
                                                        ? "✓ Passwords match"
                                                        : "✗ Do not match"}
                                                </div>
                                            )}
                                    </div>
                                ))}
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                }}
                            >
                                <button
                                    className="sfp-btn sfp-btn-danger"
                                    onClick={handleChangePassword}
                                    disabled={
                                        !passwordData.currentPassword ||
                                        !passwordData.newPassword ||
                                        !passwordData.confirmPassword ||
                                        !passwordsMatch
                                    }
                                >
                                    <RefreshCcw size={13} /> Update Password
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
