import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

const safe = (val, fallback = "") =>
    val === undefined || val === null ? fallback : val;

const normalizeAppointmentResponse = (resData) => {
    const appointment = resData?.appointment || {};
    const visits = appointment?.visits || [];
    const lastVisit = visits[visits.length - 1] || {};

    return {
        success: true,

        appointmentId: safe(appointment._id),

        patient: {
            id: safe(appointment.patient),
        },

        visit: {
            invoiceNumber: safe(lastVisit.invoiceNumber),
            date: safe(lastVisit.date),
            time: safe(lastVisit.time),

            amount: safe(lastVisit.amount, 0),
            collected: safe(lastVisit.collected, 0),
            remaining: safe(lastVisit.remaining, 0),
            status: safe(lastVisit.status, "Unpaid"),

            services: (lastVisit.service || []).map((s) => ({
                name: safe(s.name),
                amount: safe(s.amount, 0),
            })),
        },
    };
};

export const addAppointment = async (formData) => {
    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/appointment/add_appointment`,
        {
            method: "POST",
            body: formData,
        },
    );

    let data;
    try {
        data = await res.json();
    } catch (err) {
        throw new Error("Invalid server response");
    }

    if (!res.ok) {
        throw new Error(
            data?.message || data?.error || "Failed to add appointment",
        );
    }

    // 🔥 normalize everything → NO undefined anywhere
    const normalized = normalizeAppointmentResponse(data);

    return normalized;
};
