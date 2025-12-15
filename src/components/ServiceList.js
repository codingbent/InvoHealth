export default function ServiceList({
    services = [],
    selectedServices = [],
    onSelect,
}) {
    const selectedIds = new Set(selectedServices.map((s) => s._id || s.id));

    return (
        <div>
            {services.map((service) => {
                const id = service._id || service.id;
                const isChecked = selectedIds.has(id);

                return (
                    <div key={id} className="form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isChecked}
                            onChange={(e) =>
                                onSelect(service, e.target.checked)
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
