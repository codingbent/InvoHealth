import { useState, useEffect } from "react";

export default function ServiceList({ onSelect, selectedServices = [] }) {
  const [services, setServices] = useState([]);

  useEffect(() => {
    const fetchServices = async () => {
      const response = await fetch("http://localhost:5001/api/auth/fetchallservice");
      const json = await response.json();
      setServices(json);
    };
    fetchServices();
  }, []);

  return (
    <div className="d-flex flex-wrap gap-2">
      {services.map((s) => (
        <div key={s.name} className="form-check me-3 d-flex align-items-center">
          <input
            type="checkbox"
            className="form-check-input me-1"
            value={s.name}
            checked={selectedServices.includes(s.name)}
            onChange={(e) => onSelect(s.name, e.target.checked)}
          />
          <label className="form-check-label">
            {s.name}
          </label>
        </div>
      ))}
    </div>
  );
}
