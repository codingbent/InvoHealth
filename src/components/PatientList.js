import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PatientDetails from "./PatientDetails";

export default function PatientList() {
  const navigate = useNavigate();
  const [patientsByDate, setPatientsByDate] = useState({});
  const [services, setServices] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedId, setSelectedId] = useState(null);

    const API_BASE_URL = process.env.NODE_ENV === "production"
        ? "https://gmsc-backend.onrender.com"
        : "http://localhost:5001";

  useEffect(() => {
    const fetchPatients = async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/fetchpatientsbylastvisit`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjg4ZTU5ZGQzYjI3MTYwMGNlYmRiNmJhIn0sImlhdCI6MTc1NDE2MTcyMH0.1aKGE-xKtW21eqFWPvv1DdhFVddPH6StGyZpoOVye-U",
          },
        }
      );
      const json = await response.json();
      setPatientsByDate(json);
    };

const API_BASE_URL = process.env.NODE_ENV === "production"
  ? "https://gmsc-backend.onrender.com"
  : "http://localhost:5001";

    const fetchServices = async () => {
      const res = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`);
      const data = await res.json();
      setServices(data);
    };

    fetchPatients();
    fetchServices();
  }, []);

  // 🔎 Filter patients inside each group (search + service only)
  const applyFilters = (patients) => {
    return patients.filter((p) => {
      // search by name or number
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.number?.toLowerCase().includes(searchTerm.toLowerCase());

      // filter by service (if selected)
      const matchService =
        !selectedService ||
        p.service?.some(
          (s) => s.toLowerCase() === selectedService.toLowerCase()
        );

      return matchSearch && matchService;
    });
  };

  return (
    <>
      {/* Search & Filters */}
      <div className="container mt-3">
        <input
          type="text"
          className="form-control mb-2"
          placeholder="Search by name or phone"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Filter by Service */}
        <select
          className="form-select mb-2"
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
        >
          <option value="">All Services</option>
          {services.map((s) => (
            <option key={s._id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Patients Grouped by Date */}
        {Object.keys(patientsByDate)
          .sort((a, b) => {
            if (a === "No Visits") return 1; // put "No Visits" at the end
            if (b === "No Visits") return -1;
            return new Date(b) - new Date(a); // latest first
          }) // latest date first
          .map((date) => {
            const filteredGroup = applyFilters(
              Array.isArray(patientsByDate[date]) ? patientsByDate[date] : []
            );
            if (filteredGroup.length === 0) return null;

            return (
              <div key={date} className="mb-4">
                <h5 className="bg-light p-2 rounded">
                  {date === "No Visits"
                    ? "No Visits Yet"
                    : new Date(date).toLocaleDateString()}
                </h5>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Number</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
      </div>

      {/* Patient Details (optional, if using inline view) */}
      {selectedId && <PatientDetails id={selectedId} />}
    </>
  );
}
