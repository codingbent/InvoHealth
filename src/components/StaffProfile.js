import { useEffect, useState } from "react";
import { authFetch } from "./authfetch";
import {
    Lock,
    RefreshCcw,
    Phone,
    ChevronDown,
    Eye,
    EyeOff,
    LogOut,
    AlertTriangle,
    ShieldCheck,
    X,
} from "lucide-react";
import { API_BASE_URL } from "../components/config";
import "../css/Staffprofile.css";

const ROLE_COLORS = {
    receptionist: {
        bg: "rgba(96,165,250,.1)",
        border: "rgba(96,165,250,.2)",
        color: "#60a5fa",
    },
    assistant: {
        bg: "rgba(167,139,250,.1)",
        border: "rgba(167,139,250,.2)",
        color: "#a78bfa",
    },
    nurse: {
        bg: "rgba(244,114,182,.1)",
        border: "rgba(244,114,182,.2)",
        color: "#f472b6",
    },
};

/* ── Collapsible section ── */
function Section({ icon: Icon, title, accent = "#fb923c", children }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="sfp-section">
            <button
                className="sfp-section-hdr"
                onClick={() => setOpen((p) => !p)}
            >
                <span
                    className="sfp-section-icon"
                    style={{ background: `${accent}14`, color: accent }}
                >
                    <Icon size={14} />
                </span>
                <span className="sfp-section-label">{title}</span>
                <ChevronDown
                    size={13}
                    className={`sfp-chevron ${open ? "open" : ""}`}
                />
            </button>
            {open && <div className="sfp-section-body">{children}</div>}
        </div>
    );
}

export default function StaffProfile(props) {
    const [staff, setStaff] = useState(null);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [show, setShow] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [confirmOpen, setConfirmOpen] = useState(false);

    const fetchStaff = async () => {
        const res = await authFetch(`${API_BASE_URL}/api/staff/staff_profile`);
        const data = await res.json();
        if (data.success) setStaff(data.staff);
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleLeaveDoctor = async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/staff/remove_doctor`,
                { method: "POST" },
            );
            const data = await res.json();

            if (data.success) {
                props.showAlert("You have left the doctor", "success");
                localStorage.removeItem("token");
                window.location.href = "/login";
            } else
                props.showAlert(
                    data.error || "Failed to leave doctor",
                    "danger",
                );
        } catch (err) {
            props.showAlert("Server error", "danger");
        }
    };

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

    /* ── Loading ── */
    if (!staff) {
        return (
            <>
                <div className="sfp-root">
                    <div
                        className="sfp-skel"
                        style={{
                            height: 14,
                            width: 80,
                            marginBottom: 8,
                            borderRadius: 4,
                        }}
                    />
                    <div
                        className="sfp-skel"
                        style={{
                            height: 26,
                            width: 180,
                            marginBottom: 28,
                            borderRadius: 6,
                        }}
                    />
                    <div className="sfp-card">
                        <div
                            style={{
                                display: "flex",
                                gap: 18,
                                alignItems: "center",
                            }}
                        >
                            <div
                                className="sfp-skel"
                                style={{
                                    width: 52,
                                    height: 52,
                                    borderRadius: 14,
                                    flexShrink: 0,
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <div
                                    className="sfp-skel"
                                    style={{
                                        height: 14,
                                        width: "40%",
                                        marginBottom: 10,
                                        borderRadius: 5,
                                    }}
                                />
                                <div
                                    className="sfp-skel"
                                    style={{
                                        height: 9,
                                        width: "20%",
                                        borderRadius: 4,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    const rc = ROLE_COLORS[staff.role?.toLowerCase()] || ROLE_COLORS.assistant;

    return (
        <>
            <div className="sfp-root">
                <div className="sfp-eyebrow">My Account</div>
                <div className="sfp-page-title">
                    Staff <em>Profile</em>
                </div>

                {/* ── Profile Card ── */}
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
                                    <ShieldCheck size={9} /> {staff.role}
                                </span>
                            </div>
                        </div>
                        <div className="sfp-meta">
                            <div className="sfp-meta-item">
                                <Phone size={11} />
                                <span>{staff.phone}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Change Password ── */}
                <Section icon={Lock} title="Change Password" accent="#fb923c">
                    <div className="sfp-grid">
                        {[
                            {
                                key: "currentPassword",
                                label: "Current Password",
                                placeholder: "••••••••",
                                showKey: "current",
                            },
                            {
                                key: "newPassword",
                                label: "New Password",
                                placeholder: "Min. 6 characters",
                                showKey: "new",
                            },
                            {
                                key: "confirmPassword",
                                label: "Confirm Password",
                                placeholder: "Re-enter password",
                                showKey: "confirm",
                            },
                        ].map(({ key, label, placeholder, showKey }) => (
                            <div key={key} className="sfp-field">
                                <label className="sfp-label">{label}</label>
                                <div className="sfp-input-wrap">
                                    <input
                                        type={
                                            show[showKey] ? "text" : "password"
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
                                        onClick={() =>
                                            setShow((p) => ({
                                                ...p,
                                                [showKey]: !p[showKey],
                                            }))
                                        }
                                    >
                                        {show[showKey] ? (
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
                        style={{ display: "flex", justifyContent: "flex-end" }}
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
                </Section>

                {/* ── Danger Zone ── */}
                <div className="sfp-danger-zone">
                    <div className="sfp-danger-title">
                        <AlertTriangle size={10} /> Danger Zone
                    </div>
                    <button
                        className="sfp-leave-btn"
                        onClick={() => setConfirmOpen(true)}
                    >
                        <LogOut size={14} /> Leave Doctor
                    </button>
                    <div className="sfp-leave-desc">
                        You will lose access to all patients, appointments and
                        data immediately.
                    </div>
                </div>

                {/* ── Confirm Modal ── */}
                {confirmOpen && (
                    <div
                        className="sfp-modal-bg"
                        onClick={() => setConfirmOpen(false)}
                    >
                        <div
                            className="sfp-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sfp-modal-icon">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="sfp-modal-title">Leave Doctor?</div>
                            <div className="sfp-modal-desc">
                                You will lose all access to this clinic
                                immediately. This action{" "}
                                <strong style={{ color: "#f87171" }}>
                                    cannot be undone
                                </strong>
                                .
                            </div>
                            <div className="sfp-modal-actions">
                                <button
                                    className="sfp-btn sfp-btn-outline"
                                    onClick={() => setConfirmOpen(false)}
                                >
                                    <X size={13} /> Cancel
                                </button>
                                <button
                                    className="sfp-btn sfp-btn-danger"
                                    onClick={handleLeaveDoctor}
                                >
                                    <LogOut size={13} /> Leave
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
