import React from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { Stethoscope, LogOut, IndianRupee } from "lucide-react";

export default function Navbar(props) {
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const name = localStorage.getItem("name");
    const role = localStorage.getItem("role");

    // Apply theme globally
    React.useEffect(() => {
        document.body.classList.add(`dark-theme`);
    }, []);

    const handleLogout = async () => {
        localStorage.clear();
        document.body.classList.add("dark-theme");

        props.showAlert("Logged out successfully", "success");
        navigate("/");
    };

    if (role === "superadmin") {
        return (
            <>
                <nav className="navbar navbar-expand-lg shadow-sm app-navbar">
                    <div className="container-fluid">
                        {/* Brand */}
                        {role === "superadmin" ? (
                            <>
                                <NavLink
                                    className="navbar-brand fw-bold"
                                    to="/admin/fetchall_doctors"
                                >
                                    InvoHealth
                                </NavLink>
                            </>
                        ) : (
                            <>
                                <NavLink
                                    className="navbar-brand fw-bold"
                                    to="/"
                                >
                                    InvoHealth
                                </NavLink>
                            </>
                        )}

                        {/* Mobile Toggle */}
                        <button
                            className="navbar-toggler"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarSupportedContent"
                        >
                            <span className="navbar-toggler-icon" />
                        </button>

                        <div
                            className="collapse navbar-collapse"
                            id="navbarSupportedContent"
                        >
                            {/* Left Links */}
                            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                                <li className="nav-item">
                                    <NavLink
                                        className="nav-link"
                                        to="/admin/fetchall_doctors"
                                    >
                                        Home
                                    </NavLink>
                                </li>

                                <li className="nav-item">
                                    <NavLink className="nav-link" to="/about">
                                        About
                                    </NavLink>
                                </li>
                            </ul>

                            {/* Right Side */}
                            {role ? (
                                <div className="dropdown user-dropdown">
                                    <button
                                        className="btn dropdown-toggle d-flex align-items-center gap-2 p-0"
                                        data-bs-toggle="dropdown"
                                        data-bs-display="static"
                                    >
                                        <span
                                            className="avatar"
                                            style={{
                                                width: "32px",
                                                height: "32px",
                                            }}
                                        >
                                            <span className="avatar">
                                                {name?.charAt(0)?.toUpperCase()}
                                            </span>
                                        </span>
                                        <span className="d-sm-inline text-theme-secondary">
                                            {}
                                        </span>
                                    </button>

                                    <ul className="dropdown-menu dropdown-menu-end shadow-sm theme-dropdown">
                                        {!role === "superadmin" && (
                                            <li>
                                                <button
                                                    className="dropdown-item text-theme-muted d-flex align-items-center gap-2"
                                                    onClick={() =>
                                                        navigate("/profile")
                                                    }
                                                >
                                                    <Stethoscope size={16} />
                                                    My Profile
                                                </button>
                                            </li>
                                        )}
                                        <li>
                                            <button
                                                className="dropdown-item text-theme-muted d-flex align-items-center gap-2"
                                                onClick={() =>
                                                    navigate("/admin/pricing")
                                                }
                                            >
                                                <IndianRupee size={16} /> Set
                                                Pricing
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                className="dropdown-item text-danger d-flex align-items-center gap-2"
                                                onClick={handleLogout}
                                            >
                                                <LogOut size={18} />
                                                Logout
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            ) : (
                                <div className="d-flex gap-2">
                                    <NavLink
                                        to="/login"
                                        className="btn btn-primary btn-sm rounded-pill"
                                    >
                                        Login
                                    </NavLink>

                                    <NavLink
                                        to="/signup"
                                        className="btn btn-outline-primary btn-sm rounded-pill"
                                    >
                                        Sign Up
                                    </NavLink>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>
            </>
        );
    }

    return (
        <nav className="navbar navbar-expand-lg navbar-dark shadow-sm app-navbar">
            {" "}
            <div className="container-fluid">
                {/* Brand */}
                <NavLink className="navbar-brand fw-bold" to="/">
                    <span className="brand-text">InvoHealth</span>
                </NavLink>

                {/* Mobile Toggle */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarSupportedContent"
                >
                    <span className="navbar-toggler-icon" />
                </button>

                <div
                    className="collapse navbar-collapse"
                    id="navbarSupportedContent"
                >
                    {/* Left Links */}
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/">
                                Home
                            </NavLink>
                        </li>

                        {role === "doctor" && (
                            <li className="nav-item">
                                <NavLink className="nav-link" to="/dashboard">
                                    Dashboard
                                </NavLink>
                            </li>
                        )}
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/tutorials">
                                Tutorials
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/about">
                                About
                            </NavLink>
                        </li>
                    </ul>

                    {/* Right Side */}
                    {token ? (
                        <div className="dropdown user-dropdown">
                            <button
                                className="btn dropdown-toggle d-flex align-items-center gap-2 p-0"
                                data-bs-toggle="dropdown"
                                data-bs-display="static"
                            >
                                <span
                                    className="avatar"
                                    style={{ width: "32px", height: "32px" }}
                                >
                                    <span className="avatar">
                                        {name?.charAt(0)?.toUpperCase()}
                                    </span>
                                </span>
                                <span className="d-sm-inline text-theme-secondary">
                                    {name}
                                </span>
                            </button>

                            <ul className="dropdown-menu dropdown-menu-end shadow-sm theme-dropdown">
                                <li>
                                    <button
                                        className="dropdown-item text-theme-muted d-flex align-items-center gap-2"
                                        onClick={() => navigate("/profile")}
                                    >
                                        <Stethoscope size={16} />
                                        My Profile
                                    </button>
                                </li>

                                {role === "doctor" && (
                                    <li>
                                        <button
                                            className="dropdown-item text-theme-muted d-flex align-items-center gap-2"
                                            onClick={() =>
                                                navigate("/subscriptionpage")
                                            }
                                        >
                                            <IndianRupee size={16} />
                                            Billing & Subscription
                                        </button>
                                    </li>
                                )}

                                <li>
                                    <hr className="dropdown-divider" />
                                </li>

                                <li>
                                    <button
                                        className="dropdown-item text-theme-muted"
                                        onClick={() => navigate("/privacy")}
                                    >
                                        Privacy Policy
                                    </button>
                                </li>

                                <li>
                                    <button
                                        className="dropdown-item text-theme-muted"
                                        onClick={() => navigate("/terms")}
                                    >
                                        Terms & Conditions
                                    </button>
                                </li>

                                <li>
                                    <hr className="dropdown-divider" />
                                </li>
                                <li>
                                    <button
                                        className="dropdown-item text-danger d-flex align-items-center gap-2"
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={18} />
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <></>
                    )}
                </div>
            </div>
        </nav>
    );
}
