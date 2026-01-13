export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem("token");

    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "auth-token": token,
            ...(options.headers || {}),
        },
    });

    if (res.status === 401) {
        const data = await res.json();
        if (data.error === "TOKEN_EXPIRED") {
            localStorage.clear();
            // alert("Session expired. Please login again.");
            window.location.href = "/";
            return;
        }
    }

    return res;
};
