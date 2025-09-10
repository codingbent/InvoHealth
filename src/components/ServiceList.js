import { useState, useEffect } from "react";

export default function ServiceList({ onSelect, selectedServices = [], services = [] }) {
  const [localSelected, setLocalSelected] = useState([]);

  // Initialize localSelected when selectedServices changes
  useEffect(() => {
    setLocalSelected(selectedServices);
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
    <div className="d-flex flex-wrap gap-2">
      {Array.isArray(services) && services.length > 0 ? (
        services.map((s) => {
          const index = localSelected.findIndex((svc) => svc.id === s._id);
          const checked = index > -1;

          return (
            <div key={s._id} className="form-check me-3 d-flex align-items-center">
              <input
                type="checkbox"
                className="form-check-input me-1"
                checked={checked}
                onChange={(e) => handleCheckboxChange(s, e.target.checked)}
              />
              <label className="form-check-label me-2">
                {s.name} - ₹{s.amount}
              </label>
              {checked && (
                <input
                  type="number"
                  className="form-control form-control-sm w-20"
                  value={localSelected[index].amount}
                  onChange={(e) => handleAmountChange(index, e.target.value)}
                />
              )}
            </div>
          );
        })
      ) : (
        <p>No services available</p>
      )}
    </div>
  );
}