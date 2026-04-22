import { authFetch } from "../components/authfetch"; // or normal fetch if public
import { API_BASE_URL } from "../components/config";

export const fetchCountries = async () => {
    try {
        const res = await authFetch(`${API_BASE_URL}/api/admin/country`);

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to fetch countries");
        }

        return data.countries;
    } catch (err) {
        console.error("fetchCountries error:", err);
        throw err;
    }
};
