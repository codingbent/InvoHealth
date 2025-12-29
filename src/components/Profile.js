// Profile.jsx
import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import DoctorProfile from "./DoctorProfile";
import StaffProfile from "./StaffProfile";

export default function Profile(props) {
    const [role, setRole] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = jwtDecode(token);
        setRole(decoded.user.role);
    }, []);

    if (!role) return <p className="text-center mt-4">Loading...</p>;

    if (role === "doctor") return <DoctorProfile showAlert={props.showAlert} />;
    return <StaffProfile showAlert={props.showAlert} />;
}
