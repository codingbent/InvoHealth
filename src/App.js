import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import Home from "./components/Home";
import About from "./components/About";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Navbar from "./components/Navbar";
import Alert from "./components/Alert";
import PatientDetails from "./components/PatientDetails";
import Profile from "./components/Profile";
import SetStaffPassword from "./components/set-staff-password";
import Dashboard from "./components/Dashboard";
import ForgotPassword from "./components/ForgotPassword";
import AdminLogin from "./components/admin/login_admin";
import AdminDoctors from "./components/admin/fetchall_doctors";

function App() {
    const [alert, setAlert] = useState(null);

    const showAlert = (msg, type = "info") => {
        setAlert({ msg, type });
    };

    const clearAlert = () => {
        setAlert(null);
    };

    return (
        <>
            <BrowserRouter>
                <Navbar showAlert={showAlert} />
                <Alert alert={alert} clearAlert={clearAlert} />
                <Routes>
                    <Route path="/" element={<Home showAlert={showAlert} />} />
                    <Route path="/about" element={<About />} />
                    <Route
                        path="/patient/:id"
                        element={<PatientDetails showAlert={showAlert} />}
                    />
                    <Route
                        path="/login"
                        element={<Login showAlert={showAlert} />}
                    />
                    <Route
                        path="/signup"
                        element={<Signup showAlert={showAlert} />}
                    />
                    <Route
                        path="/profile"
                        element={<Profile showAlert={showAlert} />}
                    />
                    <Route
                        path="/set-staff-password"
                        element={<SetStaffPassword showAlert={showAlert} />}
                    />
                    <Route
                        path="/dashboard"
                        element={<Dashboard showAlert={showAlert} />}
                    />
                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword showAlert={showAlert} />}
                    />
                    <Route
                        path="/admin/login_admin"
                        element={<AdminLogin />}
                    />
                    <Route
                        path="/admin/fetchall_doctors"
                        element={<AdminDoctors />}
                    />
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;
