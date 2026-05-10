import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../components/config";
const PatientContext = createContext(null);

export const PatientProvider = ({ children }) => {
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem("patient_token");

    /* ── LOGIN ───────────────── */
    const login = (token, patientData) => {
        localStorage.setItem("patient_token", token);
        localStorage.setItem("patient_data", JSON.stringify(patientData));
        setPatient(patientData);
    };

    /* ── LOGOUT ───────────────── */
    const logout = useCallback(() => {
        ["patient_token", "patient_list", "patient_data"].forEach((k) =>
            localStorage.removeItem(k),
        );
        setPatient(null);
        setLoading(false);
        navigate("/patient");
    }, [navigate]);

    useEffect(() => {
        const stored = localStorage.getItem("patient_data");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setPatient(parsed);
            } catch {
                localStorage.removeItem("patient_data");
            }
        }
        setLoading(false);
    }, []);

    const updatePatient = (updatedData) => {
        setPatient(updatedData);
        localStorage.setItem("patient_data", JSON.stringify(updatedData)); // important
    };

    /* ── FETCH PROFILE ───────────────── */
    const fetchProfile = useCallback(async () => {
        const token = getToken();

        if (!token) {
            setPatient(null);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/patient/details`, {
                headers: { "auth-token": token },
            });

            // UNAUTHORIZED (token invalid)
            if (res.status === 401) {
                logout();
                return;
            }

            // PATIENT NOT FOUND (deleted)
            if (res.status === 404) {
                localStorage.removeItem("patient_token");
                localStorage.removeItem("patient_list");
                localStorage.removeItem("patient_data");

                setPatient(null);
                setLoading(false);

                navigate("/patient/login");
                return;
            }

            const data = await res.json();

            // BACKEND FAILED / NO PATIENT
            if (!data.success || !data.patient) {
                localStorage.removeItem("patient_token");
                localStorage.removeItem("patient_list");
                localStorage.removeItem("patient_data");

                setPatient(null);
                setLoading(false);

                navigate("/patient/login");
                return;
            }

            // SUCCESS
            setPatient(data.patient);
            localStorage.setItem("patient_data", JSON.stringify(data.patient));
        } catch (err) {
            console.error("Profile error:", err);
        } finally {
            setLoading(false);
        }
    }, [navigate, logout]);

    useEffect(() => {
        if (!patient) {
            fetchProfile();
        }
    }, [fetchProfile, patient]);

    return (
        <PatientContext.Provider
            value={{
                patient,
                loading,
                login,
                logout,
                fetchProfile,
                updatePatient,
            }}
        >
            {children}
        </PatientContext.Provider>
    );
};

export const usePatient = () => {
    const ctx = useContext(PatientContext);
    if (!ctx) {
        throw new Error("usePatient must be used inside Provider");
    }
    return ctx;
};
