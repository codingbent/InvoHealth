import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const fetchAvailability = async () => {
    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/timing/get_availability`,
    );

    const data = await res.json();

    if (!res.ok) throw new Error("Failed to fetch availability");

    return data.availability || [];
};
