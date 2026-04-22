import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import DoctorProfile from "./DoctorProfile";
import StaffProfile from "./StaffProfile";

export default function Profile(props) {
    const [role, setRole] = useState(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        const decoded = jwtDecode(token);
        setRole(decoded.user.role);
        // Slight delay so the shimmer loader shows briefly for smoothness
        setTimeout(() => setMounted(true), 80);
    }, []);

    if (!role) {
        return (
            <>
                <style>{`
                    @keyframes pf-bar {
                        0% { transform: scaleX(0); opacity: 0.6; }
                        50% { transform: scaleX(1); opacity: 1; }
                        100% { transform: scaleX(0); opacity: 0.6; }
                    }
                    @keyframes pf-shimmer {
                        0% { background-position: -600px 0; }
                        100% { background-position: 600px 0; }
                    }
                    .pf-loader-root {
                        min-height: 60vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 28px;
                        padding: 40px;
                    }
                    .pf-loader-bar-wrap {
                        width: 120px;
                        height: 2px;
                        background: rgba(77,124,246,0.08);
                        border-radius: 99px;
                        overflow: hidden;
                    }
                    .pf-loader-bar {
                        height: 100%;
                        width: stretch;
                        background: linear-gradient(90deg, #4d7cf6, #60a5fa);
                        border-radius: 99px;
                        transform-origin: left;
                        animation: pf-bar 1.4s ease-in-out infinite;
                    }
                    .pf-loader-cards {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        width: stretch;
                        max-width: 680px;
                    }
                    .pf-skel {
                        background: linear-gradient(90deg, #0d1117 25%, #111827 50%, #0d1117 75%);
                        background-size: 600px 100%;
                        animation: pf-shimmer 1.4s infinite linear;
                        border-radius: 8px;
                    }
                    .pf-skel-card {
                        background: #0d1117;
                        border: 1px solid #161d2e;
                        border-radius: 14px;
                        padding: 24px;
                        display: flex;
                        gap: 16px;
                        align-items: center;
                    }
                `}</style>
                <div className="pf-loader-root">
                    <div className="pf-loader-bar-wrap">
                        <div className="pf-loader-bar" />
                    </div>
                    <div className="pf-loader-cards">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="pf-skel-card"
                                style={{ opacity: 1 - i * 0.2 }}
                            >
                                <div
                                    className="pf-skel"
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: 12,
                                        flexShrink: 0,
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div
                                        className="pf-skel"
                                        style={{
                                            height: 12,
                                            width: `${50 - i * 8}%`,
                                            marginBottom: 8,
                                            borderRadius: 4,
                                        }}
                                    />
                                    <div
                                        className="pf-skel"
                                        style={{
                                            height: 9,
                                            width: `${30 - i * 4}%`,
                                            borderRadius: 4,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </>
        );
    }

    return (
        <div
            style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
            }}
        >
            {role === "doctor" ? (
                <DoctorProfile showAlert={props.showAlert} />
            ) : (
                <StaffProfile showAlert={props.showAlert} />
            )}
        </div>
    );
}
