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

export default function Navbar(props) {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const name = localStorage.getItem("name");
    const role = localStorage.getItem("role");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const dropdownRef = useRef(null);

    React.useEffect(() => {
        document.body.classList.add("dark-theme");
    }, []);

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
        props.showAlert("Logged out successfully", "success");
        navigate("/");
    };

    const NavItem = ({ to, icon: Icon, children }) => (
        <NavLink
            to={to}
            className={({ isActive }) => `nb-link ${isActive ? "active" : ""}`}
            onClick={() => setMobileOpen(false)}
        >
            {Icon && <Icon size={13} />}
            {children}
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
            {Icon && <Icon size={14} />}
            {children}
        </button>
    );

    // ── Superadmin navbar ──
    if (role === "superadmin") {
        return (
            <>
                <nav className="nb-root">
                    <div className="nb-inner">
                        <NavLink
                            className="nb-brand"
                            to="/admin/fetchall_doctors"
                        >
                            <span className="nb-brand-icon">⚕</span>
                            <span className="nb-brand-text">
                                Invo<em>Health</em>
                            </span>
                        </NavLink>

                        <div className="nb-links">
                            <NavItem to="/admin/fetchall_doctors" icon={Home}>
                                Home
                            </NavItem>
                            <NavItem to="/about" icon={Info}>
                                About
                            </NavItem>
                        </div>

                        {role && (
                            <div className="nb-user" ref={dropdownRef}>
                                <button
                                    className="nb-avatar-btn"
                                    onClick={() => setDropdownOpen((p) => !p)}
                                >
                                    <span className="nb-avatar">
                                        {name?.charAt(0)?.toUpperCase()}
                                    </span>
                                    <ChevronDown
                                        size={13}
                                        className={`nb-chevron ${dropdownOpen ? "open" : ""}`}
                                    />
                                </button>
                                {dropdownOpen && (
                                    <div className="nb-dropdown">
                                        <DropItem
                                            icon={IndianRupee}
                                            onClick={() =>
                                                navigate("/admin/pricing")
                                            }
                                        >
                                            Set Pricing
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
                        )}
                    </div>
                </nav>
            </>
        );
    }

    // ── Main navbar ──
    return (
        <>
            <nav className="nb-root">
                <div className="nb-inner">
                    {/* Brand */}
                    <NavLink className="nb-brand" to="/">
                        <span className="nb-brand-icon">⚕</span>
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
                                >
                                    <span className="nb-avatar">
                                        {name?.charAt(0)?.toUpperCase()}
                                    </span>
                                    <span className="nb-name">{name}</span>
                                    <ChevronDown
                                        size={13}
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
                                                    navigate(
                                                        "/subscriptionpage",
                                                    )
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

                        {/* Mobile hamburger */}
                        <button
                            className="nb-hamburger"
                            onClick={() => setMobileOpen((p) => !p)}
                        >
                            <span
                                className={`nb-ham-line ${mobileOpen ? "open" : ""}`}
                            />
                            <span
                                className={`nb-ham-line ${mobileOpen ? "open" : ""}`}
                            />
                            <span
                                className={`nb-ham-line ${mobileOpen ? "open" : ""}`}
                            />
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileOpen && (
                    <div className="nb-mobile">
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
                )}
            </nav>
        </>
    );
}
