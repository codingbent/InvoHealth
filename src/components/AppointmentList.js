import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AppointmentList() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState("");
    const [selectedGender, setSelectedGender] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/auth/fetchallappointments`, {
            headers: { "auth-token": localStorage.getItem("token") }
        })
            .then(res => res.json())
            .then(setAppointments);
    }, []);

    const filtered = appointments.filter(a => {
        const searchMatch =
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.number?.includes(searchTerm);

        const paymentMatch =
            !selectedPayment || a.payment_type === selectedPayment;

        const genderMatch =
            !selectedGender || a.gender === selectedGender;

        return searchMatch && paymentMatch && genderMatch;
    });

    return (
        <div className="container mt-3">
            <h4>All Appointments</h4>

            <input
                className="form-control mb-2"
                placeholder="Search name or phone"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />

            <select
                className="form-select mb-2"
                value={selectedPayment}
                onChange={e => setSelectedPayment(e.target.value)}
            >
                <option value="">All Payments</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
            </select>

            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Gender</th>
                        <th>Date</th>
                        <th>Payment</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.map((a, i) => (
                        <tr
                            key={i}
                            style={{ cursor: "pointer" }}
                            onClick={() => navigate(`/patient/${a.patientId}`)}
                        >
                            <td>{a.name}</td>
                            <td>{a.gender}</td>
                            <td>{new Date(a.date).toLocaleDateString()}</td>
                            <td>{a.payment_type}</td>
                            <td>₹ {a.amount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
