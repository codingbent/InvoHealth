import { useState, useEffect } from "react";

export default function ServiceList({ onSelect }) {
    const [services, setServices] = useState([]);

    useEffect(() => {
        const fetchServices = async () => {
            const response = await fetch(
                "http://localhost:5001/api/auth/fetchallservice"
            );
            const json = await response.json();
            setServices(json);
        };
        fetchServices();
    }, []);

    return (
        <div className="d-flex flex-wrap gap-3">
            {services.map((s, index) => (
                <div
                    key={s._id || index}
                    className="form-check d-flex align-items-center"
                >
                    <input
                        type="checkbox"
                        id={`service-${index}`}
                        value={s.name}
                        onChange={(e) =>
                            onSelect(e.target.value, e.target.checked)
                        }
                        className="form-check-input me-2"
                    />
                    <label
                        className="form-check-label"
                        htmlFor={`service-${index}`}
                    >
                        {s.name}
                    </label>
                </div>
            ))}
        </div>
    );
}
