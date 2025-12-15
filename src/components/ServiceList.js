export default function ServiceList({
    services = [],
    selectedServices = [],
    onSelect,
}) {
    return (
        <div>
            {services.map((service) => {
                const isChecked = selectedServices.some(
                    (s) => (s._id || s.id) === service._id
                );

                return (
                    <div key={service._id} className="form-check">
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
