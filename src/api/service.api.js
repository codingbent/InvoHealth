import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const fetchServices = async () => {
    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/services/fetchall_services`,
    );

    const data = await res.json();

    if (!res.ok) throw new Error("Failed to fetch services");

    return data.services || data || [];
};
