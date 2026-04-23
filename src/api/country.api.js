import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const fetchCountries = async () => {
    try {
        const res = await authFetch(`${API_BASE_URL}/api/admin/country`);

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to fetch countries");
        }

        const sorted = [...data.countries].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );

        return sorted;
    } catch (err) {
        console.error("fetchCountries error:", err);
        throw err;
    }
};
