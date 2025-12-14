import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PatientList() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGender, setSelectedGender] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // ======================
    // Fetch Patients (summary)
    // ======================
    const fetchPatients = async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}/api/auth/fetchallpatients`,
                {
                    headers: {
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );
            const data = await res.json();
            setPatients(data);
        } catch (err) {
            console.error(err);
            setPatients([]);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    // ======================
    // Filters
    // ======================
    const filteredPatients = patients.filter((p) => {
        const searchMatch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.number?.includes(searchTerm);

        const genderMatch =
            !selectedGender ||
            (p.gender || "").toLowerCase() === selectedGender.toLowerCase();

        return searchMatch && genderMatch;
    });

    return (
        <div className="container mt-3">
            <h4 className="mb-3">Patients</h4>

            {/* Search */}
            <input
                className="form-control mb-2"
                placeholder="Search name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Gender */}
            <select
                className="form-select mb-3"
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
            >
                <option value="">All Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
            </select>

            <table className="table table-bordered table-striped">
                <thead className="table-light">
                    <tr>
                        <th>Name</th>
                        <th>Number</th>
                        <th>Gender</th>
                        <th>Last Visit</th>
                        <th>Last Payment</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPatients.map((p) => (
                        <tr
                            key={p._id}
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/patient/${p._id}`)}
                        >
                            <td>{p.name}</td>
                            <td>{p.number || "N/A"}</td>
                            <td>{p.gender || "N/A"}</td>
                            <td>
                                {p.lastAppointment
                                    ? new Date(
                                          p.lastAppointment
                                      ).toLocaleDateString()
                                    : "N/A"}
                            </td>
                            <td>{p.lastpayment_type || "N/A"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Navigate to full records */}
            <button
                className="btn btn-success mt-3"
                onClick={() => navigate("/appointments")}
            >
                📥 View / Download Visit Records
            </button>
        </div>
    );
}