import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const fetchPaymentMethods = async () => {
    const res = await authFetch(`${API_BASE_URL}/api/doctor/payment_methods`);

    let data = null;
    try {
        data = await res.json();
    } catch {}

    if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch payment methods");
    }

    return data?.data || [];
};
