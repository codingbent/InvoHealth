import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./css/App.css";
import Home from "./components/Home";
import About from "./components/About";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Navbar from "./components/Navbar";
import Alert from "./components/Alert";
import PatientDetails from "./components/PatientDetails";
import Profile from "./components/Profile";
import SetStaffPassword from "./components/SetStaffPassword";
import Dashboard from "./components/Dashboard";
import ForgotPassword from "./components/ForgotPassword";
import AdminLogin from "./components/admin/login_admin";
import AdminDoctors from "./components/admin/fetchall_doctors";
import Pricing from "./components/Pricing";
import Privacy from "./components/Privacy";
import Terms from "./components/Terms";
import AdminPricing from "./components/admin/admin_pricing";
import SubscriptionPage from "./components/SubscriptionPage";
import Tutorials from "./components/Tutorials";
import AdminPayment from "./components/admin/admin_payment";
import { PrivateRoute, AdminRoute } from "./components/PrivateRoutes";
import { API_BASE_URL } from "./components/config";
import { ToastContainer } from "react-toastify";

function App() {
    const [alert, setAlert] = useState(null);
    // eslint-disable-next-line
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [usage, setUsage] = useState(null);
    const [services, setServices] = useState([]);
    const [availability, setAvailability] = useState([]);
    const [doctor, setDoctor] = useState(null);
    const [currency, setCurrency] = useState(() => {
        const saved = localStorage.getItem("currency");
        return saved ? JSON.parse(saved) : null;
    });

    const showAlert = useCallback((msg, type = "info") => {
        setAlert({ msg, type });
    }, []);

    const clearAlert = useCallback(() => {
        setAlert(null);
    }, []);

    useEffect(() => {
        if (!token) return;

        const fetchAllData = async () => {
            try {
                const [
                    servicesRes,
                    availabilityRes,
                    usageRes,
                    currencyRes,
                    doctorRes,
                ] = await Promise.all([
                    fetch(
                        `${API_BASE_URL}/api/doctor/services/fetchall_services`,
                        { headers: { "auth-token": token } },
                    ),
                    fetch(
                        `${API_BASE_URL}/api/doctor/timing/get_availability`,
                        { headers: { "auth-token": token } },
                    ),
                    fetch(`${API_BASE_URL}/api/doctor/appointment/get_usage`, {
                        headers: { "auth-token": token },
                    }),
                    fetch(`${API_BASE_URL}/api/doctor/get_currency`, {
                        headers: { "auth-token": token },
                    }),
                    fetch(
                        `${API_BASE_URL}/api/doctor/get_doc`, // ← ADD
                        { headers: { "auth-token": token } },
                    ),
                ]);

                const [
                    servicesData,
                    availabilityData,
                    usageData,
                    currencyData,
                    doctorData,
                ] = await Promise.all([
                    servicesRes.json(),
                    availabilityRes.json(),
                    usageRes.json(),
                    currencyRes.json(),
                    doctorRes.json(),
                ]);

                // services
                if (servicesData.success || Array.isArray(servicesData)) {
                    setServices(
                        Array.isArray(servicesData)
                            ? servicesData
                            : servicesData.services || [],
                    );
                }

                // availability
                if (availabilityData.success) {
                    setAvailability(availabilityData.availability || []);
                }

                // usage
                if (usageData.success) {
                    setUsage(usageData.usage);
                }

                // currency
                if (currencyData.success) {
                    const newCurrency = {
                        symbol: currencyData.symbol,
                        code: currencyData.currency,
                    };

                    setCurrency(newCurrency);
                    localStorage.setItem(
                        "currency",
                        JSON.stringify(newCurrency),
                    );
                }

                if (doctorData.success) {
                    setDoctor(doctorData.doctor);
                }
            } catch (err) {
                console.error("App init error:", err);
            }
        };

        fetchAllData();
    }, [token]);

    return (
        <>
            <ToastContainer />
            <BrowserRouter>
                <Navbar showAlert={showAlert} currency={currency} />
                <Alert alert={alert} clearAlert={clearAlert} />
                <Routes>
                    <Route
                        path="/"
                        element={
                            <Home
                                showAlert={showAlert}
                                currency={currency}
                                doctor={doctor}
                                usage={usage}
                                services={services}
                                availability={availability}
                            />
                        }
                    />
                    <Route path="/about" element={<About />} />
                    <Route
                        path="/patient/:id"
                        element={
                            <PatientDetails
                                showAlert={showAlert}
                                currency={currency}
                                usage={usage}
                                // updateUsage={updateUsage}
                                services={services}
                            />
                        }
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
                        element={
                            <PrivateRoute>
                                <Dashboard
                                    currency={currency}
                                    showAlert={showAlert}
                                />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword showAlert={showAlert} />}
                    />
                    <Route path="/admin/login_admin" element={<AdminLogin />} />
                    <Route
                        path="/admin/fetchall_doctors"
                        element={
                            <AdminRoute>
                                <AdminDoctors />
                            </AdminRoute>
                        }
                    />
                    <Route
                        path="/pricing"
                        element={<Pricing showAlert={showAlert} />}
                    />
                    <Route
                        path="/subscriptionpage"
                        element={
                            <SubscriptionPage
                                showAlert={showAlert}
                                currency={currency}
                            />
                        }
                    />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/tutorials" element={<Tutorials />} />
                    <Route path="/admin/pricing" element={<AdminPricing />} />
                    <Route path="/admin/payment" element={<AdminPayment />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;
