export default function ServiceList({
    services = [],
    selectedServices = [],
    onAdd,
    onRemove,
}) {
    const selectedIds = new Set(selectedServices.map(s => s._id));

    return (
        <>
            {/* Available services to ADD */}
            <div className="mb-2 d-flex flex-wrap gap-2">
                {services
                    .filter(s => !selectedIds.has(s._id))
                    .map(service => (
                        <button
                            key={service._id}
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => onAdd(service)}
                        >
                            {service.name} ₹{service.amount ?? 0}
                        </button>
                    ))}
            </div>

            {/* Selected services as TAGS */}
            {selectedServices.length > 0 && (
                <div className="d-flex flex-wrap gap-2">
                    {selectedServices.map(service => (
                        <span
                            key={service._id}
                            className="badge bg-primary d-flex align-items-center gap-2"
                            style={{ padding: "8px 10px" }}
                        >
                            {service.name}
                            <button
                                type="button"
                                className="btn-close btn-close-white btn-sm"
                                onClick={() => onRemove(service._id)}
                            />
                        </span>
                    ))}
                </div>
            )}
        </>
    );
}
