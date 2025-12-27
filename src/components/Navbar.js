import { Link, useNavigate } from "react-router-dom";

export default function Navbar(props) {
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const name = localStorage.getItem("name");
    const role = localStorage.getItem("role"); // doctor | receptionist | nurse | assistant

    const handleLogout = () => {
        localStorage.clear();
        props.showAlert("Logged out successfully", "success");
        navigate("/login");
    };

    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary shadow-sm">
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold" to="/">
                    InvoHealth
                </Link>

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
                    </ul>

                    {token ? (
                        <div className="dropdown">
                            <button
                                className="btn btn-light dropdown-toggle fw-semibold"
                                data-bs-toggle="dropdown"
                            >
                                👤 {name}
                            </button>

                            <ul className="dropdown-menu dropdown-menu-end">
                                {/* 👨‍⚕️ Doctor only */}
                                {role === "doctor" && (
                                    <li>
                                        <button
                                            className="dropdown-item"
                                            onClick={() => navigate("/profile")}
                                        >
                                            My Profile
                                        </button>
                                    </li>
                                )}

                                {/* 👩‍💼 Staff dashboard */}
                                {role !== "doctor" && (
                                    <li>
                                        <button
                                            className="dropdown-item"
                                            onClick={() =>
                                                navigate("/profile")
                                            }
                                        >
                                            My Profile
                                        </button>
                                    </li>
                                )}

                                <li>
                                    <hr className="dropdown-divider" />
                                </li>

                                <li>
                                    <button
                                        className="dropdown-item text-danger"
                                        onClick={handleLogout}
                                    >
                                        Logout
                                    </button>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <div className="d-flex gap-2">
                            <Link className="btn btn-primary" to="/login">
                                Login
                            </Link>
                            <Link
                                className="btn btn-outline-primary"
                                to="/signup"
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
