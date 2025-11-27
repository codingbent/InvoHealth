import { useEffect, useState } from "react";

export default function RecordList() {
    const [recordsByDate, setRecordsByDate] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedService, setSelectedService] = useState("");
    const [selectedPayment, setSelectedPayment] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // Fetch all visits from record model
    const fetchRecords = async () => {
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

            const visits = await response.json();

            // Group by date
            const grouped = visits.reduce((acc, v) => {
                const dateKey = new Date(v.date).toISOString().split("T")[0];

                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push(v);
                return acc;
            }, {});

            setRecordsByDate(grouped);
        } catch (err) {
            console.error("Error fetching visits:", err);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    // Filters
    const applyFilters = (records) => {
        return records.filter((rec) => {
            const matchSearch =
                rec.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                rec.number?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchService =
                !selectedService ||
                rec.service?.toLowerCase() === selectedService.toLowerCase();

            const matchPayment =
                !selectedPayment ||
                rec.paymentType?.toLowerCase() === selectedPayment.toLowerCase();

            return matchSearch && matchService && matchPayment;
        });
    };

    return (
        <div className="container mt-3">
            <h4 className="mb-3 text-center">📄 All Visit Records</h4>

            {/* Search */}
            <input
                type="text"
                className="form-control mb-2"
                placeholder="Search by patient name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Payment filter */}
            <select
                className="form-select mb-3"
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
            >
                <option value="">All Payments</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Other">Other</option>
            </select>

            {Object.keys(recordsByDate)
                .sort((a, b) => new Date(b) - new Date(a))
                .map((date) => {
                    let group = applyFilters(recordsByDate[date]);
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
                                        <th>Service</th>
                                        <th>Payment</th>
                                        <th>Invoice</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.patientName}</td>
                                            <td>{r.number}</td>
                                            <td>{r.doctorName}</td>
                                            <td>{r.service || "-"}</td>
                                            <td>{r.paymentType}</td>
                                            <td>{r.invoiceNumber}</td>
                                            <td>₹{r.amount}</td>
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
