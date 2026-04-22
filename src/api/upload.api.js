import { API_BASE_URL } from "../components/config";
import { authFetch } from "../components/authfetch";

export const uploadImageAPI = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await authFetch(`${API_BASE_URL}/api/doctor/image/upload`, {
        method: "POST",
        body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error("Upload failed");

    return data.url;
};

// export const updateImageUsage = async () => {
//     await authFetch(
//         `${API_BASE_URL}/api/doctor/appointment/update_usage`,
//         {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ type: "image" }),
//         }
//     );
// };