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

    // =======================
    // Fetch Patients (SUMMARY)
    // =======================
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
            setPatients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setPatients([]);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    // =======================
    // APPLY SIMPLE FILTERS
    // =======================
    const filteredPatients = patients.filter((p) => {
        const searchMatch =
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.number?.includes(searchTerm);

        const genderMatch =
            !selectedGender ||
            (p.gender || "").toLowerCase() === selectedGender.toLowerCase();

        return searchMatch && genderMatch;
    });

    // =======================
    // UI
    // =======================
    return (
        <div className="container mt-3">
            <h4 className="mb-3">Patients</h4>

            {/* SEARCH */}
            <input
                className="form-control mb-2"
                placeholder="Search by name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* GENDER FILTER */}
            <select
                className="form-select mb-3"
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
            >
                <option value="">All Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
            </select>

            {/* TABLE */}
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
        </div>
    );
}
