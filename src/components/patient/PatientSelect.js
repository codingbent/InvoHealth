import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback } from "react";
import { API_BASE_URL } from "../config";
import "../../css/patient/PatientSelect.css";
import { usePatient } from "../../context/PatientContext";

export default function PatientSelect() {
    const { login } = usePatient();
    const { state } = useLocation();
    const navigate = useNavigate();
    const [isAutoSelecting, setIsAutoSelecting] = useState(false);
    const [loadingId, setLoadingId] = useState(null);
    const patients = useMemo(() => state?.patients || [], [state]);

    const handleSelect = useCallback(
        async (p) => {
            if (loadingId) return;

            setLoadingId(p.id);

            try {
                const res = await fetch(
                    `${API_BASE_URL}/api/patient/select_profile`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            patientId: p.id,
                            email: p.email,
                        }),
                    },
                );

                const data = await res.json();

                if (data.success) {
                    const profileRes = await fetch(
                        `${API_BASE_URL}/api/patient/details`,
                        {
                            headers: {
                                "auth-token": data.token,
                            },
                        },
                    );

                    const profileData = await profileRes.json();

                    login(data.token, profileData.patient);

                    localStorage.setItem(
                        "patient_list",
                        JSON.stringify(patients),
                    );

                    navigate("/patient", { replace: true });
                }
            } catch {
                alert("Server error");
                setLoadingId(null);
            }
        },
        [loadingId, login, navigate, patients],
    );

    useEffect(() => {
        if (!patients.length) {
            navigate("/patient/login");
        }

        if (patients.length === 1) {
            handleSelect(patients[0]);
        }
    }, [patients, handleSelect, navigate]);

    useEffect(() => {
        if (!patients.length) {
            navigate("/patient/login");
            return;
        }

        if (patients.length === 1) {
            setIsAutoSelecting(true);
            handleSelect(patients[0]);
        }
    }, [patients, handleSelect, navigate]);

    if (isAutoSelecting) {
        return (
            <div className="ps-root">
                <div className="ps-container" style={{ textAlign: "center" }}>
                    <h1 className="ps-title">Logging you in...</h1>
                    <p className="ps-sub">
                        Please wait while we load your profile
                    </p>

                    <div className="ps-loader" />
                </div>
            </div>
        );
    }

    return (
        <div className="ps-root">
            <div className="ps-container">
                <h1 className="ps-title">Choose Your Profile</h1>
                <p className="ps-sub">
                    Multiple profiles are linked to this email
                </p>

                <div className="ps-list">
                    {patients.map((p) => (
                        <div
                            key={p.id}
                            className="ps-card"
                            onClick={() => handleSelect(p)}
                        >
                            <div className="ps-avatar">{p.name?.charAt(0)}</div>

                            <div className="ps-info">
                                <div className="ps-name">{p.name}</div>
                                <div className="ps-meta">
                                    {p.age || "-"} yrs · {p.gender || "-"}
                                </div>
                            </div>

                            <div className="ps-arrow">→</div>
                        </div>
                    ))}
                </div>

                <button
                    className="ps-back"
                    onClick={() => navigate("/patient/login")}
                >
                    ← Use another email
                </button>
            </div>
        </div>
    );
}
