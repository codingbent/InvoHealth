import { IndianRupee, X } from "lucide-react";

export default function ServiceList({
    services = [],
    selectedServices = [],
    onAdd,
    onRemove,
}) {
    const selectedIds = new Set(selectedServices.map((s) => s._id));
    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN").format(value);
    };
    return (
        <>
            <div className="mb-2 d-flex flex-wrap gap-2">
                {services
                    .filter((s) => !selectedIds.has(s._id))
                    .map((service) => (
                        <button
                            key={service._id}
                            type="button"
                            className="btn btn-sm btn-outline-secondary rounded-pill d-flex align-items-center gap-1"
                            onClick={() => onAdd(service)}
                        >
                            <span className="text-theme-secondary">
                                {service.name}
                            </span>
                            <span className="d-flex align-items-center gap-1 text-theme-secondary small">
                                <IndianRupee size={14} />
                                {formatCurrency(service.amount ?? 0)}
                            </span>
                        </button>
                    ))}
            </div>

            {selectedServices.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                    {selectedServices.map((service) => (
                        <div
                            key={service._id}
                            className="service-pill selected d-flex align-items-center gap-2"
                        >
                            <span>{service.name}</span>

                            <span className="d-flex align-items-center gap-1 small opacity-75">
                                <IndianRupee size={13} />
                                {formatCurrency(service.amount ?? 0)}
                            </span>

                            <button
                                type="button"
                                className="remove-btn d-flex align-items-center justify-content-center"
                                onClick={() => onRemove(service._id)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
