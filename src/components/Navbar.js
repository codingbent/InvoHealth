import { Link, useNavigate, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar(props) {
    const navigate = useNavigate();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [doctorName, setDoctorName] = useState(null);
    useEffect(() => {
        setIsLoggedIn(Boolean(localStorage.getItem("token")));
        setDoctorName(localStorage.getItem("name"));
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("name");

        setIsLoggedIn(false);
        setDoctorName(null);

        props.showAlert("Logged out successfully", "success");
        navigate("/");
    };

//     const closeNavbar = () => {
//     const navbar = document.getElementById("navbarSupportedContent");
//     if (navbar?.classList.contains("show")) {
//         navbar.classList.remove("show");
//     }
// };


    return (
        <>
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
                <div className="container-fluid">
                    <Link className="navbar-brand" to="/">
                        InvoHealth
                    </Link>

                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarSupportedContent"
                        aria-controls="navbarSupportedContent"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div
                        className="collapse navbar-collapse"
                        id="navbarSupportedContent"
                    >
                        <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                            <li className="nav-item">
                                <NavLink
                                    to="/"
                                    end
                                    className={({ isActive }) =>
                                        `nav-link ${isActive ? "active" : ""}`
                                    }
                                >
                                    Home
                                </NavLink>
                            </li>

                            <li className="nav-item">
                                <NavLink
                                    to="/about"
                                    className={({ isActive }) =>
                                        `nav-link ${isActive ? "active" : ""}`
                                    }
                                >
                                    About
                                </NavLink>
                            </li>
                        </ul>

                        {isLoggedIn ? (
                            <div className="dropdown">
                                <button
                                    className="btn btn-light dropdown-toggle fw-semibold"
                                    data-bs-toggle="dropdown"
                                >
                                    👤 {doctorName}
                                </button>

                                <ul className="dropdown-menu dropdown-menu-end">
                                    <li>
                                        <button
                                            className="dropdown-item"
                                            onClick={() => navigate("/profile")}
                                        >
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
                                            Logout
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        ) : (
                            <div className="d-flex">
                                <Link
                                    className="btn btn-primary mx-2"
                                    to="/login"
                                >
                                    Login
                                </Link>
                                <Link
                                    className="btn btn-primary mx-2"
                                    to="/signup"
                                >
                                    Sign Up
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </>
    );
}
