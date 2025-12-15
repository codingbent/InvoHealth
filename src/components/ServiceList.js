export default function ServiceList({
    services = [],
    selectedServices = [],
    onSelect,
}) {
    const selectedIds = new Set(
        selectedServices.map(s => s.serviceId)
    );

    return (
        <div>
            {services.map(service => {
                const serviceId = service._id;
                const isChecked = selectedIds.has(serviceId);

                return (
                    <div key={serviceId} className="form-check">
                        <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isChecked}
                            onChange={(e) =>
                                onSelect(
                                    {
                                        serviceId,
                                        name: service.name,
                                        amount: service.amount || 0,
                                    },
                                    e.target.checked
                                )
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
