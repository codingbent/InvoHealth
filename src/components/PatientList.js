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

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  useEffect(() => {
    // fetch patients
    const fetchPatients = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/auth/fetchpatientsbylastvisit`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "auth-token": localStorage.getItem("token"),
            },
          }
        );
        const json = await response.json();
        setPatientsByDate(json || {});
      } catch (err) {
        console.error("Error fetching patients:", err);
        setPatientsByDate({});
      }
    };

    // fetch services (✅ with token)
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

    fetchPatients();
    fetchServices();
  }, [API_BASE_URL]);

  // 🔎 Filter patients inside each group (search + service only)
  const applyFilters = (patients) => {
    return patients.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.number?.toLowerCase().includes(searchTerm.toLowerCase());

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

        {/* 👥 Patients grouped by last visit */}
        {Object.keys(patientsByDate)
          .sort((a, b) => {
            if (a === "No Visits") return 1;
            if (b === "No Visits") return -1;
            return new Date(b) - new Date(a);
          })
          .map((date) => {
            let group = Array.isArray(patientsByDate[date]) ? patientsByDate[date] : [];
            
            // 🆕 Sort "No Visits" group by createdAt (latest first)
            if (date === "No Visits") {
              group = [...group].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            const filteredGroup = applyFilters(group);
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

      {selectedId && <PatientDetails id={selectedId} />}
    </>
  );
}
