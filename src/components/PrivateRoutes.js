import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

// Check token validity (expiry)
const isTokenValid = (token) => {
    try {
        const decoded = jwtDecode(token);

        if (!decoded.exp) return false;

        const currentTime = Date.now() / 1000;
        return decoded.exp > currentTime;
    } catch (err) {
        return false;
    }
};

// PRIVATE ROUTE
export const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem("token");

    if (!token || !isTokenValid(token)) {
        localStorage.removeItem("token"); // cleanup
        return <Navigate to="/login" replace />;
    }

    return children;
};

// ADMIN ROUTE
export const AdminRoute = ({ children }) => {
    const token = localStorage.getItem("admintoken");

    if (!token || !isTokenValid(token)) {
        localStorage.removeItem("admintoken");
        return <Navigate to="/admin/login_admin" replace />;
    }

    try {
        const decoded = jwtDecode(token);

        // role from token (NOT localStorage)
        if (decoded.role !== "superadmin") {
            return <Navigate to="/admin/login_admin" replace />;
        }

        return children;
    } catch (err) {
        return <Navigate to="/admin/login_admin" replace />;
    }
};
