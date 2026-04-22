import { X, Plus } from "lucide-react";
import "../css/Servicelist.css"

export default function ServiceList({
    services,
    selectedServices = [],
    onAdd,
    onRemove,
    currency,
}) {
    const selectedIds = new Set(selectedServices.map((s) => String(s._id)));
    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);

    return (
        <>
            {/* Available services */}
            <div className="sl-available">
                {services
                    .filter((s) => !selectedIds.has(String(s._id)))
                    .map((service) => (
                        <button
                            key={service._id}
                            type="button"
                            className="sl-avail-chip"
                            onClick={() => onAdd(service)}
                        >
                            <Plus size={11} className="sl-avail-plus" />
                            <span className="sl-avail-name">
                                {service.name}
                            </span>
                            <span className="sl-avail-amount">
                                {currency?.symbol}
                                {fmt(service.amount ?? 0)}
                            </span>
                        </button>
                    ))}
            </div>

            {/* Selected services */}
            {selectedServices.length > 0 && (
                <div className="sl-selected">
                    {selectedServices.map((service) => (
                        <div key={service._id} className="sl-selected-pill">
                            <span className="sl-selected-name">
                                {service.name}
                            </span>
                            <span className="sl-selected-amount">
                                {currency?.symbol}
                                {fmt(service.amount ?? 0)}
                            </span>
                            <button
                                type="button"
                                className="sl-remove-btn"
                                onClick={() => onRemove(service._id)}
                            >
                                <X size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
