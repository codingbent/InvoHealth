import React, { useState, useRef, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import {
    Home,
    Info,
    User,
    LogOut,
    ChevronDown,
    Users,
    FileText,
} from "lucide-react";
import { usePatient } from "../../context/PatientContext";
import { API_BASE_URL } from "../config";
import "../../css/patient/PatientNavbar.css";

export default function PatientNavbar({ showAlert }) {
    const { patient, logout, login } = usePatient();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [profileOpen, setProfileOpen] = useState(false);
    const [switchOpen, setSwitchOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const profileRef = useRef(null);
    const switchRef = useRef(null);

    /* ── Close dropdowns on outside click ───────────────────────────────── */
    useEffect(() => {
        const handler = (e) => {
            if (
                profileRef.current &&
                !profileRef.current.contains(e.target) &&
                switchRef.current &&
                !switchRef.current.contains(e.target)
            ) {
                setProfileOpen(false);
                setSwitchOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* ── Load saved patient list ─────────────────────────────────────────── */
    useEffect(() => {
        const stored = localStorage.getItem("patient_list");
        if (stored) {
            try {
                setPatients(JSON.parse(stored));
            } catch {}
        }
    }, [patient]);

    /* ── Switch profile ──────────────────────────────────────────────────── */
    const handleSwitch = async (p) => {
        try {
            const currentToken = localStorage.getItem("patient_token");

            const res = await fetch(
                `${API_BASE_URL}/api/patient/select_profile`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": currentToken,
                    },
                    body: JSON.stringify({ patientId: p.id, email: p.email }),
                },
            );

            const data = await res.json();

            if (!data.success) {
                showAlert?.(data.error || "Switch failed", "danger");
                return;
            }

            // fetch full profile
            const profileRes = await fetch(
                `${API_BASE_URL}/api/patient/details`,
                {
                    headers: { "auth-token": data.token },
                },
            );

            // IF PATIENT NOT FOUND → REMOVE FROM LIST
            if (profileRes.status === 404) {
                let stored = JSON.parse(
                    localStorage.getItem("patient_list") || "[]",
                );

                const updated = stored.filter((x) => x.id !== p.id);

                localStorage.setItem("patient_list", JSON.stringify(updated));
                setPatients(updated);

                showAlert?.("This profile is no longer available", "warning");
                return;
            }

            const profileData = await profileRes.json();

            if (!profileData.success || !profileData.patient) {
                showAlert?.("Failed to load full profile", "danger");
                return;
            }
            login(data.token, profileData.patient);
            showAlert?.("Switched successfully", "success");
            setSwitchOpen(false);
        } catch {
            showAlert?.("Connection error", "danger");
        }
    };

    const handleLogout = () => {
        logout();
        showAlert?.("Logged Out successfully", "success");
        navigate("/patient");
    };

    const initials = patient?.name?.charAt(0)?.toUpperCase() || "P";

    /* ── Active NavLink class helper ─────────────────────────────────────── */
    const navLinkClass = ({ isActive }) =>
        `pnav__link${isActive ? " pnav__link--active" : ""}`;

    return (
        <>
            <nav className="pnav">
                <div className="pnav-inner">
                    {/* ── Left: brand + links ─────────────────────────────── */}
                    <div className="pnav-left">
                        <NavLink to="/patient" className="pnav__brand">
                            <span className="pnav__brand-mark">⚕</span>
                            <span className="pnav__brand-text">
                                Invo<em>Health</em>
                            </span>
                        </NavLink>

                        <div className="pnav__links">
                            <NavLink to="/patient" end className={navLinkClass}>
                                <Home size={13} /> Home
                            </NavLink>

                            {/* Switch profile — only if multiple patients */}
                            {patients.length > 1 && (
                                <div className="pnav__switch" ref={switchRef}>
                                    <button
                                        type="button"
                                        className={`pnav__link pnav__switch-btn${switchOpen ? " pnav__link--active" : ""}`}
                                        onClick={() => {
                                            setSwitchOpen((v) => !v);
                                            setProfileOpen(false);
                                        }}
                                    >
                                        <Users size={13} />
                                        Switch
                                        <ChevronDown
                                            size={11}
                                            className={`pnav__chevron${switchOpen ? " pnav__chevron--open" : ""}`}
                                        />
                                    </button>

                                    {switchOpen && (
                                        <div className="pnav__dropdown pnav__switch-dropdown">
                                            <div className="pnav__dropdown-header">
                                                Switch account
                                            </div>
                                            {patients.map((p) => (
                                                <button
                                                    type="button"
                                                    key={p.id}
                                                    className={`pnav__dropdown-item${p.id === patient?.id ? " pnav__dropdown-item--active" : ""}`}
                                                    onClick={() =>
                                                        handleSwitch(p)
                                                    }
                                                >
                                                    <span className="pnav__switch-avatar">
                                                        {p.name
                                                            ?.charAt(0)
                                                            ?.toUpperCase()}
                                                    </span>
                                                    <span className="pnav__switch-name">
                                                        {p.name}
                                                    </span>
                                                    {p.id === patient?.id && (
                                                        <span className="pnav__switch-check">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <NavLink
                                to="/patient/records"
                                className={navLinkClass}
                            >
                                <FileText size={13} /> Records
                            </NavLink>

                            <NavLink
                                to="/patient/about"
                                className={navLinkClass}
                            >
                                <Info size={13} /> About
                            </NavLink>
                        </div>
                    </div>

                    {/* ── Right: profile + hamburger ───────────────────────── */}
                    <div className="pnav__right">
                        {patient && (
                            <div className="pnav__profile" ref={profileRef}>
                                <button
                                    type="button"
                                    className="pnav__profile-btn"
                                    onClick={() => {
                                        setProfileOpen((v) => !v);
                                        setSwitchOpen(false);
                                    }}
                                >
                                    <div className="pnav__avatar">
                                        {initials}
                                    </div>
                                    <span className="pnav__patient-name">
                                        {patient.name}
                                    </span>
                                    <ChevronDown
                                        size={12}
                                        className={`pnav__chevron${profileOpen ? " pnav__chevron--open" : ""}`}
                                    />
                                </button>

                                {profileOpen && (
                                    <div className="pnav__dropdown pnav__profile-dropdown">
                                        <div className="pnav__dropdown-header">
                                            <span className="pnav__dropdown-name">
                                                {patient.name}
                                            </span>
                                            <span className="pnav__dropdown-email">
                                                {patient.email}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            className="pnav__dropdown-item"
                                            onClick={() => {
                                                setProfileOpen(false);
                                                navigate("/patient/profile");
                                            }}
                                        >
                                            <span className="pnav__item-icon">
                                                <User size={13} />
                                            </span>
                                            View Profile
                                        </button>

                                        <hr className="pnav__dropdown-divider" />

                                        <button
                                            type="button"
                                            className="pnav__dropdown-item pnav__dropdown-item--danger"
                                            onClick={handleLogout}
                                        >
                                            <span className="pnav__item-icon">
                                                <LogOut size={13} />
                                            </span>
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Hamburger — mobile only */}
                        <button
                            type="button"
                            className={`pnav__hamburger${mobileOpen ? " pnav__hamburger--open" : ""}`}
                            onClick={() => setMobileOpen((v) => !v)}
                            aria-label="Toggle menu"
                        >
                            <span className="pnav__ham-bar" />
                            <span className="pnav__ham-bar" />
                            <span className="pnav__ham-bar" />
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Mobile drawer ─────────────────────────────────────────────── */}
            {mobileOpen && (
                <div className="pnav__mobile">
                    {patient && (
                        <>
                            <div className="pnav__mobile-user">
                                <div className="pnav__avatar pnav__avatar--lg">
                                    {initials}
                                </div>
                                <div className="pnav__mobile-user-info">
                                    <span className="pnav__mobile-user-name">
                                        {patient.name}
                                    </span>
                                    <span className="pnav__mobile-user-email">
                                        {patient.email}
                                    </span>
                                </div>
                            </div>
                            <hr className="pnav__mobile-divider" />
                        </>
                    )}

                    <NavLink
                        to="/patient"
                        end
                        className={({ isActive }) =>
                            `pnav__mobile-link${isActive ? " pnav__mobile-link--active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <Home size={14} style={{ marginRight: 8 }} /> Home
                    </NavLink>

                    <NavLink
                        to="/patient/records"
                        className={({ isActive }) =>
                            `pnav__mobile-link${isActive ? " pnav__mobile-link--active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <FileText size={14} style={{ marginRight: 8 }} />{" "}
                        Records
                    </NavLink>

                    <NavLink
                        to="/patient/about"
                        className={({ isActive }) =>
                            `pnav__mobile-link${isActive ? " pnav__mobile-link--active" : ""}`
                        }
                        onClick={() => setMobileOpen(false)}
                    >
                        <Info size={14} style={{ marginRight: 8 }} /> About
                    </NavLink>

                    <hr className="pnav__mobile-divider" />

                    <button
                        type="button"
                        className="pnav__mobile-action"
                        onClick={() => {
                            setMobileOpen(false);
                            navigate("/patient/profile");
                        }}
                    >
                        <User size={14} /> View Profile
                    </button>

                    {patients.length > 1 && (
                        <>
                            <hr className="pnav__mobile-divider" />
                            <div className="pnav__mobile-switch-label">
                                Switch account
                            </div>
                            {patients.map((p) => (
                                <button
                                    type="button"
                                    key={p.id}
                                    className={`pnav__mobile-action${p.id === patient?.id ? " pnav__mobile-action--active" : ""}`}
                                    onClick={() => {
                                        setMobileOpen(false);
                                        handleSwitch(p);
                                    }}
                                >
                                    <span className="pnav__switch-avatar">
                                        {p.name?.charAt(0)?.toUpperCase()}
                                    </span>
                                    {p.name}
                                    {p.id === patient?.id && (
                                        <span className="pnav__switch-check">
                                            ✓
                                        </span>
                                    )}
                                </button>
                            ))}
                        </>
                    )}

                    <hr className="pnav__mobile-divider" />

                    <button
                        type="button"
                        className="pnav__mobile-action pnav__mobile-action--danger"
                        onClick={handleLogout}
                    >
                        <LogOut size={14} /> Logout
                    </button>
                </div>
            )}
        </>
    );
}
