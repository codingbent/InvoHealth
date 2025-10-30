import { useEffect, useState } from "react";

export default function AppointmentReport() {
    const [visits, setVisits] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState("");
    const [loading, setLoading] = useState(true);

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // 🔄 Fetch all appointment visits
    const fetchVisits = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `${API_BASE_URL}/api/report/fetch-all-visits`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": localStorage.getItem("token"),
                    },
                }
            );

            const data = await response.json();
            if (Array.isArray(data)) {
                setVisits(data);
            } else {
                console.error("Unexpected response:", data);
                setVisits([]);
            }
        } catch (err) {
            console.error("Error fetching visits:", err);
            setVisits([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisits();
    }, [API_BASE_URL]);

    // 🔎 Apply filters
    const filteredVisits = visits.filter((v) => {
        const matchSearch =
            v.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.doctorName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchPayment =
            !selectedPayment ||
            v.paymentType?.toLowerCase() === selectedPayment.toLowerCase();
        return matchSearch && matchPayment;
    });

    return (
        <div className="container mt-3">
            <h4 className="mb-3 text-center">📅 Appointment Report</h4>

            {/* 🔍 Search by patient or doctor */}
            <input
                type="text"
                className="form-control mb-2"
                placeholder="Search by patient or doctor"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* 💳 Filter by Payment Type */}
            <select
                className="form-select mb-3"
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
            >
                <option value="">All Payment Types</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Other">Other</option>
            </select>

            {loading ? (
                <p className="text-center">Loading appointments...</p>
            ) : filteredVisits.length === 0 ? (
                <p className="text-center">No records found.</p>
            ) : (
                <table className="table table-bordered table-striped align-middle">
                    <thead className="table-light">
                        <tr>
                            <th>Patient</th>
                            <th>Doctor</th>
                            <th>Date</th>
                            <th>Payment Type</th>
                            <th>Invoice No</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredVisits.map((v, i) => (
                            <tr key={i}>
                                <td>{v.patientName}</td>
                                <td>{v.doctorName}</td>
                                <td>
                                    {new Date(v.date).toLocaleDateString(
                                        "en-IN",
                                        {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        }
                                    )}
                                </td>
                                <td>{v.paymentType}</td>
                                <td>{v.invoiceNumber}</td>
                                <td>₹{v.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}