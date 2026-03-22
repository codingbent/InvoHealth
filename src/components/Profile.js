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
            <>
                <style>{`
                @keyframes pf-pulse {
                    0%,80%,100% { transform:scale(1);opacity:.4; }
                    40% { transform:scale(1.4);opacity:1; }
                }
            `}</style>
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "60vh",
                        gap: 8,
                    }}
                >
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#2e3d5c",
                                display: "inline-block",
                                animation: `pf-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                            }}
                        />
                    ))}
                </div>
            </>
        );

    if (role === "doctor") return <DoctorProfile showAlert={props.showAlert} />;

    return <StaffProfile showAlert={props.showAlert} />;
}
