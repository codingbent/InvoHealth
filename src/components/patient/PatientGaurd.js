import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const PatientGuard = ({ children }) => {
    const token = localStorage.getItem("patient_token");

    if (!token) {
        return <Navigate to="/patient" replace />;
    }

    try {
        const decoded = jwtDecode(token);

        // No exp claim → malformed token
        if (!decoded?.exp) {
            localStorage.removeItem("patient_token");
            return <Navigate to="/patient" replace />;
        }

        // Token expired
        if (Date.now() / 1000 > decoded.exp) {
            localStorage.removeItem("patient_token");
            return <Navigate to="/patient" replace />;
        }

        // Enforce token type — must be a patient token
        if (decoded?.patient?.role !== "patient") {
            localStorage.removeItem("patient_token");
            return <Navigate to="/patient" replace />;
        }
    } catch {
        // Malformed / tampered token — clear and redirect
        localStorage.removeItem("patient_token");
        return <Navigate to="/patient" replace />;
    }

    return children;
};

export default PatientGuard;
