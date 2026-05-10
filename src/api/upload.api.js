import { API_BASE_URL } from "../components/config";
import { authFetch } from "../components/authfetch";

export const uploadImageAPI = async (file) => {
    try {
        const formData = new FormData();
        formData.append("image", file);

        const res = await authFetch(`${API_BASE_URL}/api/doctor/image/upload`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Upload failed");
        }

        return {
            url: data.url,
            public_id: data.public_id,
            type: file.type,
        };
    } catch (err) {
        console.error("Upload error:", err);
        throw err;
    }
};

export const uploadMultipleAPI = async (files) => {
    const formData = new FormData();

    files.forEach((file) => {
        formData.append("images", file);
    });

    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/image/upload-multi`,
        {
            method: "POST",
            body: formData,
        },
    );

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.error || "Upload failed");
    }

    return data.images.map((img, index) => ({
        url: img.url,
        public_id: img.public_id,
        type: files[index]?.type || "",
    }));
};
