import { useState, useEffect } from "react";

export default function ServiceList({ onSelect, selectedServices = [], services = [] }) {
  const [localSelected, setLocalSelected] = useState([]);

  // Initialize localSelected when selectedServices changes
 useEffect(() => {
    const normalized = (selectedServices || []).map((s) => ({
      id: s._id || s.id, // ensure always `id`
      name: s.name,
      amount: s.amount || 0,
    }));
    setLocalSelected(normalized);
  }, [selectedServices]);

  const handleCheckboxChange = (service, checked) => {
    let updated = [...localSelected];

    if (checked) {
      if (!updated.some((s) => s.id === service._id)) {
        updated.push({ id: service._id, name: service.name, amount: service.amount || 0 });
      }
    } else {
      updated = updated.filter((s) => s.id !== service._id);
    }

    setLocalSelected(updated);
    onSelect(updated);
  };

  const handleAmountChange = (index, value) => {
    const updated = [...localSelected];
    updated[index].amount = Number(value);
    setLocalSelected(updated);
    onSelect(updated);
  };

  return (
    <div>
      {services.map((service) => {
        const isChecked = selectedServices.some(
          (s) => s._id === service._id || s.name === service.name
        );

        return (
          <div key={service._id} className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              checked={isChecked}
              onChange={(e) => onSelect(service, e.target.checked)}
            />
            <label className="form-check-label">
              {service.name} ({service.amount})
            </label>
          </div>
        );
      })}
    </div>
  );
}