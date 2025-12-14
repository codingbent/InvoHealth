import { useEffect, useState } from "react";

export default function AppointmentRecord() {
    const [visitsByDate, setVisitsByDate] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // Fetch all visits (each visit = one record)
    const fetchAllVisits = async () => {
        try {
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
            if (!Array.isArray(data)) return;

            // group by date
            const grouped = data.reduce((acc, v) => {
                const dateKey = new Date(v.date)
                    .toISOString()
                    .split("T")[0];
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(v);
                return acc;
            }, {});

            setVisitsByDate(grouped);
        } catch (err) {
            console.error("Error fetching visits:", err);
            setVisitsByDate({});
        }
    };

    useEffect(() => {
        fetchAllVisits();
    }, []);

    // 🔍 Filter
    const applyFilters = (visits) => {
        return visits.filter((v) => {
            const matchSearch =
                v.patientName
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                v.number?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchPayment =
                !selectedPayment ||
                v.paymentType?.toLowerCase() ===
                    selectedPayment.toLowerCase();
            return matchSearch && matchPayment;
        });
    };

    return (
        <div className="container mt-3">
            <h4 className="mb-3 text-center">🩺 All Appointment Visits</h4>

            <input
                type="text"
                className="form-control mb-2"
                placeholder="Search by name or number"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
                className="form-select mb-3"
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
            >
                <option value="">All Payment Types</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="ICICI">ICICI</option>
                <option value="HDFC">HDFC</option>
                <option value="Other">Other</option>
            </select>

            {Object.keys(visitsByDate)
                .sort((a, b) => new Date(b) - new Date(a))
                .map((date) => {
                    const group = applyFilters(visitsByDate[date]);
                    if (group.length === 0) return null;

                    return (
                        <div key={date} className="mb-4">
                            <h5 className="bg-light p-2 rounded">
                                {new Date(date).toLocaleDateString()}
                            </h5>

                            <table className="table table-striped table-bordered align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Patient</th>
                                        <th>Number</th>
                                        <th>Doctor</th>
                                        <th>Payment</th>
                                        <th>Invoice</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.map((v, i) => (
                                        <tr key={i}>
                                            <td>{v.patientName}</td>
                                            <td>{v.number}</td>
                                            <td>{v.doctorName}</td>
                                            <td>{v.paymentType}</td>
                                            <td>{v.invoiceNumber}</td>
                                            <td> {v.amount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
        </div>
    );
}