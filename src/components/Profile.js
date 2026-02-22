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

    if (!role)
        return (
            <div className="d-flex flex-column align-items-center justify-content-center mt-5">
                <div
                    className="spinner-border text-primary mb-2"
                    role="status"
                />
                <span className="text-theme-secondary">Loading profile…</span>
            </div>
        );

    if (role === "doctor") return <DoctorProfile showAlert={props.showAlert} />;

    return <StaffProfile showAlert={props.showAlert} />;
}
