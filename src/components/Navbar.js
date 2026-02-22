import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Stethoscope,User,LogOut } from "lucide-react";

export default function Navbar(props) {
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const name = localStorage.getItem("name");
    const role = localStorage.getItem("role");

    const [theme, setTheme] = React.useState(
        localStorage.getItem("theme") || "light",
    );
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const saveTheme = async (newTheme) => {
        const res = await fetch(`${API_BASE_URL}/api/doctor/theme_doctor`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "auth-token": localStorage.getItem("token"),
            },
            body: JSON.stringify({ theme: newTheme }),
        });

        const data = await res.json();
        if (!data.success) {
            console.error("Theme save failed", data);
        }
    };

    // Apply theme globally
    React.useEffect(() => {
        document.body.classList.remove("light-theme", "dark-theme");
        document.body.classList.add(`${theme}-theme`);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => {
            const next = prev === "light" ? "dark" : "light";
            saveTheme(next);
            return next;
        });
    };

    const handleLogout = () => {
        localStorage.clear();
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        props.showAlert("Logged out successfully", "success");
        navigate("/login");
    };

    return (
        <nav className="navbar navbar-expand-lg shadow-sm app-navbar">
            <div className="container-fluid">
                {/* Brand */}
                <Link className="navbar-brand fw-bold" to="/">
                    InvoHealth
                </Link>

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
                            <Link className="nav-link" to="/">
                                Home
                            </Link>
                        </li>

                        {role === "doctor" && (
                            <li className="nav-item">
                                <Link className="nav-link" to="/dashboard">
                                    Dashboard
                                </Link>
                            </li>
                        )}

                        <li className="nav-item">
                            <Link className="nav-link" to="/about">
                                About
                            </Link>
                        </li>

                        {/* Theme Toggle */}
                        {token && (
                            <li className="nav-item d-flex align-items-center ms-lg-3">
                                <button
                                    onClick={toggleTheme}
                                    className={`theme-toggle ${theme}`}
                                    aria-label="Toggle theme"
                                >
                                    <div className="toggle-track">
                                        <div className="toggle-thumb">
                                            {theme === "dark" ? "🌙" : "☀️"}
                                        </div>
                                    </div>
                                </button>
                            </li>
                        )}
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
                                    <User size={18}/>
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

                                <li>
                                    <hr className="dropdown-divider" />
                                </li>

                                <li>
                                    <button
                                        className="dropdown-item text-danger"
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={18}/>
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <div className="d-flex gap-2">
                            <Link
                                to="/login"
                                className="btn btn-primary btn-sm rounded-pill"
                            >
                                Login
                            </Link>
                            <Link
                                to="/signup"
                                className="btn btn-outline-primary btn-sm rounded-pill"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
