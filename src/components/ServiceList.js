export default function ServiceList({
    services = [],
    selectedServices = [],
    onAdd,
    onRemove,
}) {
    const selectedIds = new Set(selectedServices.map((s) => s._id));

    return (
        <>
            {/* AVAILABLE SERVICES */}
            <div className="d-flex flex-wrap gap-2 mb-3">
                {services.map((service) => {
                    const isSelected = selectedIds.has(service._id);

                    return (
                        <button
                            key={service._id}
                            type="button"
                            className={`btn btn-sm ${
                                isSelected
                                    ? "btn-secondary"
                                    : "btn-outline-primary"
                            }`}
                            disabled={isSelected}
                            onClick={() => onAdd(service)}
                        >
                            {service.name} ₹{service.amount}
                        </button>
                    );
                })}
            </div>

            {/* SELECTED TAGS */}
            <div className="d-flex flex-wrap gap-2">
                {selectedServices.map((s) => (
                    <span
                        key={s._id}
                        className="badge bg-primary d-flex align-items-center"
                        style={{ gap: "6px", padding: "8px 10px" }}
                    >
                        {s.name}
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            style={{ fontSize: "0.6rem" }}
                            onClick={() => onRemove(s._id)}
                        />
                    </span>
                ))}
            </div>
        </>
    );
}
