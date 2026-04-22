import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const addPatient = async (payload) => {
    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/patient/add_patient`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        }
    );

    return res.json();
};