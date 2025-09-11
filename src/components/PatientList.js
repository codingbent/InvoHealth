import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientDetails from "./PatientDetails";

export default function PatientList() {
  const navigate = useNavigate();
  const [patientsByDate, setPatientsByDate] = useState({});
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedPaymentType, setSelectedPaymentType] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  // 🗑️ Delete patient
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this patient?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/deletepatient/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });

      const data = await response.json();
      if (data.success) {
        alert("Patient deleted successfully!");
        fetchPatients();
      } else {
        alert(data.message || "Failed to delete patient");
      }
    } catch (err) {
      console.error("Error deleting patient:", err);
      alert("Server error while deleting patient");
    }
  };

  // fetch patients
  const fetchPatients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/fetchallpatients`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });

      const patients = await response.json();

      const grouped = patients.reduce((acc, p) => {
        const dateKey = p.lastAppointment
          ? new Date(p.lastAppointment).toISOString().split("T")[0]
          : "No Visits";

        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(p);
        return acc;
      }, {});

      setPatientsByDate(grouped);
    } catch (err) {
      console.error("Error fetching patients:", err);
      setPatientsByDate({});
    }
  };

  // fetch services
  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem("token"),
        },
      });

      const data = await response.json();
      if (Array.isArray(data)) {
        setServices(data);
      } else {
        console.error("Expected array, got:", data);
        setServices([]);
      }
    } catch (err) {
      console.error("Error fetching services:", err);
      setServices([]);
    }
  };

  useEffect(() => {
    fetchPatients();
    fetchServices();
  }, [API_BASE_URL]);

  // 🔎 Filter patients
  const applyFilters = (patients) => {
    return patients.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchService =
        !selectedService ||
        p.service?.some((s) => {
          if (typeof s === "string") {
            return s.toLowerCase() === selectedService.toLowerCase();
          }
          if (typeof s === "object" && s.name) {
            return s.name.toLowerCase() === selectedService.toLowerCase();
          }
          return false;
        });

      const matchPayment =
        !selectedPaymentType ||
        (p.paymentType &&
          p.paymentType.toLowerCase() === selectedPaymentType.toLowerCase());

      return matchSearch && matchService && matchPayment;
    });
  };

  return (
    <>
      <div className="container mt-3">
        {/* 🔎 Search */}
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Search by name or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* 🏥 Filter by Service */}
        <select
          className="form-select mb-2"
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
        >
          <option value="">All Services</option>
          {Array.isArray(services) &&
            services.map((s) => (
              <option key={s._id} value={s.name}>
                {s.name}
              </option>
            ))}
        </select>

        {/* 💳 Filter by Payment Type */}
        <select
          className="form-select mb-3"
          value={selectedPaymentType}
          onChange={(e) => setSelectedPaymentType(e.target.value)}
        >
          <option value="">All Payment Types</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
        </select>

        {/* 👥 Patients grouped by last visit */}
        {Object.keys(patientsByDate)
          .sort((a, b) => {
            if (a === "No Visits") return 1;
            if (b === "No Visits") return -1;
            return new Date(b) - new Date(a);
          })
          .map((date) => {
            let group = Array.isArray(patientsByDate[date])
              ? patientsByDate[date]
              : [];

            group = [...group].sort((a, b) => {
              const dateA = new Date(a.lastVisitDate || a.createdAt);
              const dateB = new Date(b.lastVisitDate || b.createdAt);
              return dateB - dateA;
            });

            const filteredGroup = applyFilters(group);
            if (filteredGroup.length === 0) return null;

            return (
              <div key={date} className="mb-4">
                <h5 className="bg-light p-2 rounded">
                  {date === "No Visits"
                    ? "No Visits Yet"
                    : new Date(date).toLocaleDateString()}
                </h5>

                <table className="table table-striped table-bordered align-middle">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: "25%" }}>Name</th>
                      <th style={{ width: "20%" }}>Number</th>
                      <th style={{ width: "20%" }}>Payment</th>
                      <th style={{ width: "35%" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroup.map((p) => (
                      <tr
                        key={p._id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/patient/${p._id}`)}
                      >
                        <td>{p.name}</td>
                        <td>{p.number}</td>
                        <td>{p.lastPaymentType || "N/A"}</td>
                        <td className="text-center">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(p._id);
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
      </div>

      {selectedId && <PatientDetails id={selectedId} />}
    </>
  );
}