import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

export default function AppointmentList() {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPayment, setSelectedPayment] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // ======================
    // Fetch appointments
    // ======================
    useEffect(() => {
        fetch(`${API_BASE_URL}/api/auth/fetchallappointments`, {
            headers: {
                "auth-token": localStorage.getItem("token"),
            },
        })
            .then((res) => res.json())
            .then(setAppointments)
            .catch(() => setAppointments([]));
    }, []);

    // ======================
    // Filter logic
    // ======================
    const filteredAppointments = appointments.filter((a) => {
        const searchMatch =
            a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.number?.includes(searchTerm);

        const paymentMatch =
            !selectedPayment ||
            a.payment_type?.toLowerCase() ===
                selectedPayment.toLowerCase();

        const genderMatch =
            !selectedGender ||
            a.gender?.toLowerCase() === selectedGender.toLowerCase();

        const dateMatch =
            (!startDate || new Date(a.date) >= new Date(startDate)) &&
            (!endDate || new Date(a.date) <= new Date(endDate));

        return searchMatch && paymentMatch && genderMatch && dateMatch;
    });

    // ======================
    // Smart Excel Export
    // ======================
    const downloadExcel = () => {
        const hasAnyFilter =
            searchTerm ||
            selectedPayment ||
            selectedGender ||
            startDate ||
            endDate;

        const dataToExport = hasAnyFilter
            ? filteredAppointments
            : appointments;

        if (dataToExport.length === 0) {
            alert("No data to export");
            return;
        }

        const rows = dataToExport.map((a) => ({
            Name: a.name,
            Number: a.number,
            Gender: a.gender,
            Date: new Date(a.date).toLocaleDateString(),
            Payment: a.payment_type,
            Amount: a.amount,
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Appointments");

        XLSX.writeFile(wb, "Visit-Records.xlsx");
    };

    return (
        <div className="container mt-3">
            <h4 className="mb-3">Appointments</h4>

            {/* Filters */}
            <input
                className="form-control mb-2"
                placeholder="Search name or phone"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
                className="form-select mb-2"
                value={selectedPayment}
                onChange={(e) => setSelectedPayment(e.target.value)}
            >
                <option value="">All Payments</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="ICICI">ICICI</option>
                <option value="HDFC">HDFC</option>
            </select>

            <select
                className="form-select mb-2"
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
            >
                <option value="">All Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
            </select>

            <div className="row mb-3">
                <div className="col">
                    <input
                        type="date"
                        className="form-control"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="col">
                    <input
                        type="date"
                        className="form-control"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>

            <button
                className="btn btn-success mb-3"
                onClick={downloadExcel}
            >
                📥 Download Excel
            </button>

            {/* Table */}
            <table className="table table-bordered table-striped">
                <thead className="table-light">
                    <tr>
                        <th>Name</th>
                        <th>Gender</th>
                        <th>Date</th>
                        <th>Payment</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredAppointments.map((a, i) => (
                        <tr
                            key={i}
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                                navigate(`/patient/${a.patientId}`)
                            }
                        >
                            <td>{a.name}</td>
                            <td>{a.gender}</td>
                            <td>
                                {new Date(a.date).toLocaleDateString()}
                            </td>
                            <td>{a.payment_type}</td>
                            <td>₹ {a.amount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
