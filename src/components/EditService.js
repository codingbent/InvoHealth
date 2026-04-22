import { useState, useEffect, useCallback } from "react";
import { authFetch } from "./authfetch";
import { Pencil, X, Check, Loader2 } from "lucide-react";
import { API_BASE_URL } from "../components/config";
import SuccessOverlay from "./SuccessOverlay";
// import "../css/Fxsuccess.css";
import "../css/Editservice.css";

const EditService = ({ showAlert, onClose, currency }) => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState("");
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false); // ← added

    const fetchServices = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/services/fetchall_services`,
            );
            const data = await res.json();
            if (Array.isArray(data)) setServices(data);
            else if (Array.isArray(data.services)) setServices(data.services);
            else setServices([]);
        } catch (err) {
            console.error(err);
            setServices([]);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleSelect = (id) => {
        const service = services.find((s) => s._id === id);
        if (!service) return;
        setSelectedService(service._id);
        setName(service.name || "");
        setAmount(
            service.amount !== null && service.amount !== undefined
                ? String(service.amount)
                : "",
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedService) {
            showAlert("Please select a service", "warning");
            return;
        }
        setLoading(true);
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/services/update_service/${selectedService}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: name.trim(),
                        amount: amount === "" ? "" : Number(amount),
                    }),
                },
            );
            const data = await res.json();
            if (data.success) {
                setServices((prev) =>
                    prev.map((s) =>
                        s._id === selectedService
                            ? {
                                  ...s,
                                  name,
                                  amount: amount === "" ? null : Number(amount),
                              }
                            : s,
                    ),
                );
                setSelectedService("");
                setName("");
                setAmount("");
                setShowSuccess(true); // ← trigger animation
            } else {
                showAlert(data.error || "Failed to update service", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Error updating service", "danger");
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line
    const selectedObj = services.find((s) => s._id === selectedService);

    return (
        <div className="modal-dialog modal-dialog-centered">
            <div
                className="modal-content es-modal"
                style={{ position: "relative" }}
            >
                {/* ── Futuristic success overlay (purple variant) ── */}
                <SuccessOverlay
                    visible={showSuccess}
                    onDone={() => {
                        setShowSuccess(false);
                        showAlert("Service updated successfully", "success");
                    }}
                    title="Service Updated"
                    sub="Changes saved"
                    variant="purple"
                    duration={1800}
                />

                {/* Header */}
                <div className="es-header">
                    <div className="es-header-left">
                        <div className="es-icon">
                            <Pencil size={15} />
                        </div>
                        <div className="es-title">
                            Edit <em>Service</em>
                        </div>
                    </div>
                    <button className="es-close" onClick={onClose}>
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="es-body">
                    <select
                        className="es-select"
                        value={selectedService}
                        onChange={(e) => handleSelect(e.target.value)}
                    >
                        <option value="">Choose a service</option>
                        {services.map((s) => (
                            <option key={s._id} value={s._id}>
                                {s.name}
                            </option>
                        ))}
                    </select>

                    <input
                        type="text"
                        className="es-input"
                        placeholder="Service name"
                        value={name || selectedObj?.name || ""}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!selectedService}
                    />

                    <div className="es-input-wrap">
                        <span className="es-input-prefix">
                            {currency?.symbol}
                        </span>
                        <input
                            type="number"
                            className="es-input"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0"
                            disabled={!selectedService}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="es-footer">
                    <button
                        className="es-btn es-btn-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        className="es-btn es-btn-submit"
                        onClick={handleSubmit}
                        disabled={!selectedService || loading}
                    >
                        {loading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <>
                                <Check size={13} /> Update
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditService;
