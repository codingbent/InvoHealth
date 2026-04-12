import { useEffect } from "react";
import axios from "axios";
import Patient from "../components/Patient";

export default function Home(props) {
    const { showAlert } = props;

        const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    useEffect(() => {
        const callApis = async () => {
            try {
                const [res1, res2] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/authentication/wake-n8n`),
                    axios.get(`${API_BASE_URL}/api/health`)
                ]);

                console.log(res1.data, res2.data);
            } catch (error) {
                console.error(error);
            }
        };

        callApis();
    }, [API_BASE_URL]);

    return (
        <>
            <Patient showAlert={showAlert} />
        </>
    );
}
