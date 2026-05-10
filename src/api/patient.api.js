import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const addPatient = async ({
    name,
    gender,
    countryId,
    number,
    email,
    dob,
}) => {
    const res = await authFetch(
        `${API_BASE_URL}/api/doctor/patient/add_patient`,
        {
            method: "POST",
            body: JSON.stringify({
                name,
                gender,
                countryId,
                number,
                email,
                dob,
            }),
        },
    );
    return res.json();
};
