import { useState, useEffect } from "react";

export default function ServiceList({
    onSelect,
    selectedServices = [],
    services = [],
}) {
    const [localSelected, setLocalSelected] = useState([]);

    // Initialize localSelected whenever selectedServices changes
    useEffect(() => {
        const normalized = (selectedServices || []).map((s) => ({
            _id: s._id || s.id,
            id: s._id || s.id,
            name: s.name,
            amount: s.amount || 0,
        }));
        setLocalSelected(normalized);
    }, [selectedServices]);

    const handleCheckboxChange = (service, checked) => {
        let updated = [...localSelected];

        if (checked) {
            if (!updated.some((s) => s.id === (service._id || service.id))) {
                updated.push({
                    id: service._id || service.id,
                    _id: service._id,
                    name: service.name,
                    amount: service.amount || 0,
                });
            }
        } else {
            updated = updated.filter(
                (s) => s.id !== (service._id || service.id)
            );
        }

        setLocalSelected(updated);
        onSelect(service, checked); // pass single service and checked
    };

    return (
        <div>
            {services.map((service) => {
                const isChecked = localSelected.some(
                    (s) => s.id === (service._id || service.id)
                );

                return (
                    <div key={service._id} className="form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isChecked}
                            onChange={(e) =>
                                handleCheckboxChange(service, e.target.checked)
                            }
                        />
                        <label className="form-check-label">
                            {service.name} ({service.amount || 0})
                        </label>
                    </div>
                );
            })}
        </div>
    );
}
