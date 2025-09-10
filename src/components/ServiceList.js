import { useState, useEffect } from "react";

export default function ServiceList({ onSelect, selectedServices = [] }) {
  const [services, setServices] = useState([]);

  const API_BASE_URL =
    process.env.NODE_ENV === "production"
      ? "https://gmsc-backend.onrender.com"
      : "http://localhost:5001";

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const token = localStorage.getItem("token"); // 👈 from login/signup response
        const response = await fetch(`${API_BASE_URL}/api/auth/fetchallservice`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": token || "", // 👈 required for fetchuser
          },
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Error ${response.status}`);
        }

        const json = await response.json();
        if (Array.isArray(json)) setServices(json);
        else setServices([]);
      } catch (err) {
        console.error("Error fetching services:", err);
        setServices([]);
      }
    };

    fetchServices();
  }, []);

  return (
    <div className="d-flex flex-wrap gap-2">
      {services.length > 0 ? (
        services.map((s) => (
          <div key={s._id} className="form-check me-3 d-flex align-items-center">
            <input
              type="checkbox"
              className="form-check-input me-1"
              value={s.name}
              checked={selectedServices.includes(s.name)}
              onChange={(e) => onSelect(s.name, e.target.checked)}
            />
            <label className="form-check-label">
              {s.name} - ₹{s.amount}
            </label>
          </div>
        ))
      ) : (
        <p>No services available</p>
      )}
    </div>
  );
}
