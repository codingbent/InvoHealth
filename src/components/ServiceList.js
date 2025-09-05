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
        <div className="form-check">
            {services.map((s, index) => (
                <div key={s._id || index} className="mb-2">
                    <input
                        type="checkbox"
                        id={`service-${index}`}
                        value={s.name}
                        onChange={(e) =>
                            onSelect(e.target.value, e.target.checked)
                        }
                        className="form-check-input"
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
