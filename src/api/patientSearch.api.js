import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const searchPatients = async (query) => {
    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/patient/search_patient?q=${encodeURIComponent(query)}`,
    );
    return res.json();
};
