import { useEffect, useState } from "react";

export default function DoctorProfile() {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [doctor, setDoctor] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchDoctor = async () => {
        try {
            const token = localStorage.getItem("token");

            const response = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
                headers: {
                    "auth-token": token,
                },
            });

            const data = await response.json();
            if (data.success) {
                setDoctor(data.doctor);
            }
        } catch (err) {
            console.error("Error fetching doctor:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctor();
    }, []);

    if (loading) return <p className="text-center mt-4">Loading Profile...</p>;
    if (!doctor) return <p className="text-center mt-4">No profile data found.</p>;

    return (
        <div className="container mt-4">
            <h2 className="mb-4 text-primary">My Profile</h2>

            <div className="card shadow-sm p-4">
                <h4 className="text-secondary mb-3">Personal Information</h4>

                <p><strong>Name:</strong> {doctor.name}</p>
                <p><strong>Email:</strong> {doctor.email}</p>
                <p><strong>Phone:</strong> {doctor.phone}</p>
                {doctor.appointmentPhone && (
                    <p><strong>Appointment Phone:</strong> {doctor.appointmentPhone}</p>
                )}

                <p><strong>Clinic Name:</strong> {doctor.clinicName}</p>

                <hr />

                <h4 className="text-secondary mb-3">Professional Information</h4>

                <p>
                    <strong>Degree:</strong>{" "}
                    {doctor.degree?.length ? doctor.degree.join(", ") : "N/A"}
                </p>

                <p><strong>Reg Number:</strong> {doctor.regNumber || "N/A"}</p>

                <p><strong>Experience:</strong> {doctor.experience} years</p>

                <hr />

                <h4 className="text-secondary mb-3">Address</h4>

                <p><strong>Line 1:</strong> {doctor.address?.line1}</p>
                {doctor.address?.line2 && (
                    <p><strong>Line 2:</strong> {doctor.address.line2}</p>
                )}
                {doctor.address?.line3 && (
                    <p><strong>Line 3:</strong> {doctor.address.line3}</p>
                )}

                <p>
                    <strong>City:</strong> {doctor.address?.city}
                </p>
                <p>
                    <strong>State:</strong> {doctor.address?.state}
                </p>
                <p>
                    <strong>Pincode:</strong> {doctor.address?.pincode}
                </p>
            </div>
        </div>
    );
}
