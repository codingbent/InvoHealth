import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./css/App.css";

// ── Doctor / admin imports ───────────────────────────────────────────────────
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

// ── Patient imports ──────────────────────────────────────────────────────────
import PatientLogin from "./components/patient/PatientLogin";
import PatientNavbar from "./components/patient/PatientNavbar";
import PatientHome from "./components/patient/PatientHome";
import PatientDoctorView from "./components/patient/PatientDoctorview";
import PatientAbout from "./components/patient/PatientAbout";
import PatientProfile from "./components/patient/PatientProfile";
import PatientGuard from "./components/patient/PatientGaurd";
import { PatientProvider } from "./context/PatientContext";
import PatientSelect from "./components/patient/PatientSelect";
import PatientRecords from "./components/patient/PatientRecords";

// ── Determine which app to show ──────────────────────────────────────────────
const { hostname, port } = window.location;
const isPatientApp = hostname.includes("patient") || port === "3001";

// ── Patient App ──────────────────────────────────────────────────────────────
function PatientApp({ showAlert }) {
  return (
    <PatientProvider>
      <PatientNavbar showAlert={showAlert} />
      <Routes>
        {/* Public patient routes */}
        <Route
          path="/patient/login"
          element={<PatientLogin showAlert={showAlert} />}
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/patient" replace />} />

        <Route
          path="/patient"
          element={<PatientHome showAlert={showAlert} />}
        />
        <Route
          path="/patient/select"
          element={<PatientSelect showAlert={showAlert} />}
        />
        {/* Protected patient routes — all wrapped in PatientGuard */}
        <Route
          path="/patient/doctor/:doctorId"
          element={
            <PatientGuard>
              <PatientDoctorView showAlert={showAlert} />
            </PatientGuard>
          }
        />
        <Route
          path="/patient/profile"
          element={
            <PatientGuard>
              <PatientProfile showAlert={showAlert} />
            </PatientGuard>
          }
        />

        <Route
          path="/patient/records"
          element={
            <PatientGuard>
              <PatientRecords showAlert={showAlert} />
            </PatientGuard>
          }
        />

        <Route
          path="/patient/about"
          element={<PatientAbout showAlert={showAlert} />}
        />
      </Routes>
    </PatientProvider>
  );
}

// ── Doctor/Admin App ─────────────────────────────────────────────────────────
function DoctorApp({
  showAlert,
  currency,
  doctor,
  usage,
  services,
  availability,
  country,
}) {
  return (
    <>
      <ToastContainer />
      <Navbar showAlert={showAlert} currency={currency} />
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
              country={country}
            />
          }
        />
        <Route path="/about" element={<About />} />
        <Route
          path="/patient/:id"
          element={
            <PrivateRoute>
              <PatientDetails
                showAlert={showAlert}
                currency={currency}
                usage={usage}
                services={services}
              />
            </PrivateRoute>
          }
        />
        <Route path="/login" element={<Login showAlert={showAlert} />} />
        <Route path="/signup" element={<Signup showAlert={showAlert} />} />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile showAlert={showAlert} />
            </PrivateRoute>
          }
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
                country={country}
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
        <Route path="/pricing" element={<Pricing showAlert={showAlert} />} />
        <Route
          path="/subscriptionpage"
          element={
            <SubscriptionPage showAlert={showAlert} currency={currency} />
          }
        />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/tutorials" element={<Tutorials />} />
        <Route
          path="/admin/pricing"
          element={
            <AdminRoute>
              <AdminPricing />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/payment"
          element={
            <AdminRoute>
              <AdminPayment />
            </AdminRoute>
          }
        />
      </Routes>
    </>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
function App() {
  const [alert, setAlert] = useState(null);
  const token = localStorage.getItem("token");
  const [usage, setUsage] = useState(null);
  const [services, setServices] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [country, setCountry] = useState(null);
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem("currency");
    return saved ? JSON.parse(saved) : null;
  });

  const showAlert = useCallback((msg, type = "info") => {
    setAlert({ msg, type });
  }, []);

  const clearAlert = useCallback(() => setAlert(null), []);

  // Only runs for doctor app with a valid doctor token
  useEffect(() => {
    if (!token || isPatientApp) return;

    const fetchAllData = async () => {
      try {
        const [
          servicesRes,
          availabilityRes,
          usageRes,
          currencyRes,
          doctorRes,
          countryRes,
        ] = await Promise.all([
          fetch(`${API_BASE_URL}/api/doctor/services/fetchall_services`, {
            headers: { "auth-token": token },
          }),
          fetch(`${API_BASE_URL}/api/doctor/timing/get_availability`, {
            headers: { "auth-token": token },
          }),
          fetch(`${API_BASE_URL}/api/doctor/appointment/get_usage`, {
            headers: { "auth-token": token },
          }),
          fetch(`${API_BASE_URL}/api/doctor/get_currency`, {
            headers: { "auth-token": token },
          }),
          fetch(`${API_BASE_URL}/api/doctor/get_doc`, {
            headers: { "auth-token": token },
          }),
          fetch(`${API_BASE_URL}/api/admin/country`),
        ]);

        const [
          servicesData,
          availabilityData,
          usageData,
          currencyData,
          doctorData,
          countryData,
        ] = await Promise.all([
          servicesRes.json(),
          availabilityRes.json(),
          usageRes.json(),
          currencyRes.json(),
          doctorRes.json(),
          countryRes.json(),
        ]);

        if (servicesData.success || Array.isArray(servicesData)) {
          setServices(
            Array.isArray(servicesData)
              ? servicesData
              : servicesData.services || [],
          );
        }
        if (availabilityData.success)
          setAvailability(availabilityData.availability || []);
        if (usageData.success) setUsage(usageData.usage);
        if (currencyData.success) {
          const newCurrency = {
            symbol: currencyData.symbol,
            code: currencyData.currency,
          };
          setCurrency(newCurrency);
          localStorage.setItem("currency", JSON.stringify(newCurrency));
        }
        if (doctorData.success && countryData.success) {
          const matched = countryData.countries.find(
            (c) => c._id === doctorData.doctor.address.countryId,
          );
          setCountry(matched);
          setDoctor(doctorData.doctor);
        }
      } catch (err) {
        console.error("App init error:", err);
      }
    };

    fetchAllData();
  }, [token]);

  return (
    <BrowserRouter>
      <Alert alert={alert} clearAlert={clearAlert} />
      {isPatientApp ? (
        <PatientApp showAlert={showAlert} />
      ) : (
        <DoctorApp
          showAlert={showAlert}
          currency={currency}
          doctor={doctor}
          usage={usage}
          services={services}
          availability={availability}
          country={country}
        />
      )}
    </BrowserRouter>
  );
}

export default App;
