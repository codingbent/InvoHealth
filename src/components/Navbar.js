import React, { useState, useRef, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import {
    Stethoscope,
    LogOut,
    IndianRupee,
    ChevronDown,
    LayoutDashboard,
    BookOpen,
    Info,
    Home,
    ShieldCheck,
    FileText,
} from "lucide-react";
import "../css/Navbar.css";

export default function Navbar(props) {
    const { showAlert } = props;
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("name");
    const role = localStorage.getItem("role");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleLogout = async () => {
        localStorage.clear();
        document.body.classList.add("dark-theme");
        showAlert("Logged out successfully", "success");
        navigate("/");
    };

    const NavItem = ({ to, icon: Icon, children }) => (
        <NavLink
            to={to}
            className={({ isActive }) => `nb-link ${isActive ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
        >
            {Icon && <Icon size={13} />}
            <span>{children}</span>
        </NavLink>
    );

    const DropItem = ({ icon: Icon, children, onClick, danger }) => (
        <button
            className={`nb-drop-item ${danger ? "danger" : ""}`}
            onClick={() => {
                setDropdownOpen(false);
                onClick();
            }}
        >
            {Icon && (
                <span className="nb-drop-item-icon">
                    <Icon size={14} />
                </span>
            )}
            <span>{children}</span>
        </button>
    );

    // ── Superadmin navbar ──
    if (role === "superadmin") {
        return (
            <nav className="nb-root">
                {/* Scanline sweep on mount */}
                <div className="nb-scanline" aria-hidden />
                {/* Bottom glow rule */}
                <div className="nb-rule" aria-hidden />

                <div className="nb-inner">
                    <NavLink className="nb-brand" to="/admin/fetchall_doctors">
                        <span className="nb-brand-icon" aria-hidden>
                            ⚕
                        </span>
                        <span className="nb-brand-text">
                            Invo<em>Health</em>
                        </span>
                        <span className="nb-brand-tag">ADMIN</span>
                    </NavLink>

                    <div className="nb-links">
                        <NavItem to="/admin/fetchall_doctors" icon={Home}>
                            Home
                        </NavItem>
                        <NavItem to="/about" icon={Info}>
                            About
                        </NavItem>
                    </div>

                    <div className="nb-right">
                        <div className="nb-user" ref={dropdownRef}>
                            <button
                                className="nb-avatar-btn"
                                onClick={() => setDropdownOpen((p) => !p)}
                                aria-expanded={dropdownOpen}
                            >
                                <span className="nb-avatar nb-avatar--admin">
                                    A
                                    <span
                                        className="nb-avatar-ring"
                                        aria-hidden
                                    />
                                </span>
                                <span className="nb-avatar-label">Admin</span>
                                <ChevronDown
                                    size={12}
                                    className={`nb-chevron ${dropdownOpen ? "open" : ""}`}
                                />
                            </button>

                            {dropdownOpen && (
                                <div className="nb-dropdown">
                                    <div className="nb-drop-header">
                                        <div className="nb-drop-name">
                                            Administrator
                                        </div>
                                        <div className="nb-drop-role">
                                            <span className="nb-drop-role-dot" />
                                            superadmin
                                        </div>
                                    </div>
                                    <div className="nb-drop-divider" />
                                    <DropItem
                                        icon={IndianRupee}
                                        onClick={() =>
                                            navigate("/admin/pricing")
                                        }
                                    >
                                        Set Pricing
                                    </DropItem>
                                    <DropItem
                                        icon={IndianRupee}
                                        onClick={() =>
                                            navigate("/admin/payment")
                                        }
                                    >
                                        Payment Method
                                    </DropItem>
                                    <div className="nb-drop-divider" />
                                    <DropItem
                                        icon={LogOut}
                                        onClick={handleLogout}
                                        danger
                                    >
                                        Logout
                                    </DropItem>
                                </div>
                            )}
                        </div>

                        <button
                            className={`nb-hamburger ${mobileOpen ? "open" : ""}`}
                            onClick={() => setMobileOpen((p) => !p)}
                            aria-label="Toggle menu"
                        >
                            <span className="nb-ham-line" />
                            <span className="nb-ham-line" />
                            <span className="nb-ham-line" />
                        </button>
                    </div>
                </div>

                {mobileOpen && (
                    <div className="nb-mobile">
                        <div className="nb-mobile-inner">
                            <NavItem to="/admin/fetchall_doctors" icon={Home}>
                                Home
                            </NavItem>
                            <NavItem to="/about" icon={Info}>
                                About
                            </NavItem>
                            <div className="nb-mobile-divider" />
                            <NavItem to="/admin/pricing" icon={IndianRupee}>
                                Set Pricing
                            </NavItem>
                            <NavItem to="/admin/payment" icon={IndianRupee}>
                                Payment Methods
                            </NavItem>
                            <div className="nb-mobile-divider" />
                            <button
                                className="nb-mobile-logout"
                                onClick={handleLogout}
                            >
                                <LogOut size={14} /> Logout
                            </button>
                        </div>
                    </div>
                )}
            </nav>
        );
    }

    // ── Main navbar ──
    return (
        <nav className="nb-root">
            <div className="nb-scanline" aria-hidden />
            <div className="nb-rule" aria-hidden />

            <div className="nb-inner">
                {/* Brand */}
                <NavLink className="nb-brand" to="/">
                    <span className="nb-brand-icon" aria-hidden>
                        ⚕
                    </span>
                    <span className="nb-brand-text">
                        Invo<em>Health</em>
                    </span>
                </NavLink>

                {/* Desktop links */}
                <div className="nb-links">
                    <NavItem to="/" icon={Home}>
                        Home
                    </NavItem>
                    {role === "doctor" && (
                        <NavItem to="/dashboard" icon={LayoutDashboard}>
                            Dashboard
                        </NavItem>
                    )}
                    <NavItem to="/tutorials" icon={BookOpen}>
                        Tutorials
                    </NavItem>
                    <NavItem to="/about" icon={Info}>
                        About
                    </NavItem>
                </div>

                {/* Right side */}
                <div className="nb-right">
                    {token ? (
                        <div className="nb-user" ref={dropdownRef}>
                            <button
                                className="nb-avatar-btn"
                                onClick={() => setDropdownOpen((p) => !p)}
                                aria-expanded={dropdownOpen}
                            >
                                <span className="nb-avatar">
                                    {name?.charAt(0)?.toUpperCase()}
                                    <span
                                        className="nb-avatar-ring"
                                        aria-hidden
                                    />
                                </span>
                                <span className="nb-name">{name}</span>
                                <ChevronDown
                                    size={12}
                                    className={`nb-chevron ${dropdownOpen ? "open" : ""}`}
                                />
                            </button>

                            {dropdownOpen && (
                                <div className="nb-dropdown">
                                    <div className="nb-drop-header">
                                        <div className="nb-drop-name">
                                            {name}
                                        </div>
                                        <div className="nb-drop-role">
                                            <span className="nb-drop-role-dot" />
                                            {role}
                                        </div>
                                    </div>
                                    <div className="nb-drop-divider" />
                                    <DropItem
                                        icon={Stethoscope}
                                        onClick={() => navigate("/profile")}
                                    >
                                        My Profile
                                    </DropItem>
                                    {role === "doctor" && (
                                        <DropItem
                                            icon={IndianRupee}
                                            onClick={() =>
                                                navigate("/subscriptionpage")
                                            }
                                        >
                                            Billing & Subscription
                                        </DropItem>
                                    )}
                                    <div className="nb-drop-divider" />
                                    <DropItem
                                        icon={ShieldCheck}
                                        onClick={() => navigate("/privacy")}
                                    >
                                        Privacy Policy
                                    </DropItem>
                                    <DropItem
                                        icon={FileText}
                                        onClick={() => navigate("/terms")}
                                    >
                                        Terms & Conditions
                                    </DropItem>
                                    <div className="nb-drop-divider" />
                                    <DropItem
                                        icon={LogOut}
                                        onClick={handleLogout}
                                        danger
                                    >
                                        Logout
                                    </DropItem>
                                </div>
                            )}
                        </div>
                    ) : null}

                    <button
                        className={`nb-hamburger ${mobileOpen ? "open" : ""}`}
                        onClick={() => setMobileOpen((p) => !p)}
                        aria-label="Toggle menu"
                    >
                        <span className="nb-ham-line" />
                        <span className="nb-ham-line" />
                        <span className="nb-ham-line" />
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="nb-mobile">
                    <div className="nb-mobile-inner">
                        <NavItem to="/" icon={Home}>
                            Home
                        </NavItem>
                        {role === "doctor" && (
                            <NavItem to="/dashboard" icon={LayoutDashboard}>
                                Dashboard
                            </NavItem>
                        )}
                        <NavItem to="/tutorials" icon={BookOpen}>
                            Tutorials
                        </NavItem>
                        <NavItem to="/about" icon={Info}>
                            About
                        </NavItem>
                        {token && (
                            <>
                                <div className="nb-mobile-divider" />
                                <NavItem to="/profile" icon={Stethoscope}>
                                    My Profile
                                </NavItem>
                                {role === "doctor" && (
                                    <NavItem
                                        to="/subscriptionpage"
                                        icon={IndianRupee}
                                    >
                                        Billing & Subscription
                                    </NavItem>
                                )}
                                <NavItem to="/privacy" icon={ShieldCheck}>
                                    Privacy Policy
                                </NavItem>
                                <NavItem to="/terms" icon={FileText}>
                                    Terms & Conditions
                                </NavItem>
                                <div className="nb-mobile-divider" />
                                <button
                                    className="nb-mobile-logout"
                                    onClick={handleLogout}
                                >
                                    <LogOut size={14} /> Logout
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
