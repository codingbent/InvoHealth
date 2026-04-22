import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";
export const addAppointment = async (formData) => {
    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/appointment/add_appointment`,
        {
            method: "POST",
            body: formData, // ❗ NO JSON.stringify
        },
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(
            data.message || data.error || "Failed to add appointment",
        );
    }

    return data;
};
