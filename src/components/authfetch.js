export class AuthError extends Error {
    constructor(code, message) {
        super(message || code);
        this.name = "AuthError";
        this.code = code; // "TOKEN_EXPIRED" | "INVALID_TOKEN" | "NO_TOKEN" | "ACCESS_REVOKED"
    }
}

export class SubscriptionError extends Error {
    constructor(message) {
        super(message || "Subscription expired. Upgrade required.");
        this.name = "SubscriptionError";
        this.code = "SUBSCRIPTION_EXPIRED";
    }
}

export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");

    const isFormData = options.body instanceof FormData;

    const res = await fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
            "auth-token": token,
        },
    });

    // ── 401: token is missing, invalid, or expired ───────────────────────────
    if (res.status === 401) {
        let data = null;
        try {
            data = await res.json();
        } catch {
            // body not JSON — still treat as auth failure
        }

        const code = data?.error || "INVALID_TOKEN";

        if (
            code === "TOKEN_EXPIRED" ||
            code === "INVALID_TOKEN" ||
            code === "NO_TOKEN"
        ) {
            localStorage.clear();
            window.location.href = "/login";
            throw new AuthError(code, "Session expired. Redirecting to login.");
        }

        // Any other 401 (e.g. ACCESS_REVOKED for staff)
        throw new AuthError(code, data?.error || "Unauthorized");
    }

    // ── 403: subscription expired or access denied ───────────────────────────
    if (res.status === 403) {
        let data = null;
        try {
            data = await res.json();
        } catch {}

        const message = data?.message || data?.error || "Access denied";
        throw new SubscriptionError(message);
    }

    // ── Any other non-ok response ────────────────────────────────────────────
    if (!res.ok) {
        let errorData = null;
        try {
            errorData = await res.json();
        } catch {}
        throw new Error(
            errorData?.error || errorData?.message || "Request failed",
        );
    }

    return res;
};
