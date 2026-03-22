import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "./authfetch";
import { Pencil, IndianRupee, X, Check } from "lucide-react";

const EditService = ({ showAlert, onClose }) => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState("");
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");

    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );

    const fetchServices = useCallback(async () => {
        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/services/fetchall_services`,
            );
            const data = await response.json();
            if (Array.isArray(data)) setServices(data);
            else if (Array.isArray(data.services)) setServices(data.services);
            else setServices([]);
        } catch (err) {
            console.error(err);
            setServices([]);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleSelect = (id) => {
        const service = services.find((s) => s._id === id);
        if (service) {
            setSelectedService(service._id);
            setName(service.name);
            setAmount(service.amount);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedService) {
            showAlert("Please select a service", "warning");
            return;
        }
        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/services/update_service/${selectedService}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, amount }),
                },
            );
            const data = await response.json();
            if (data.success) {
                showAlert("Service updated successfully", "success");
                setSelectedService("");
                setName("");
                setAmount("");
            } else {
                showAlert("Failed to update service", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Error updating service", "danger");
        }
    };

    const selectedObj = services.find((s) => s._id === selectedService);

    return (
        <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content es-modal">
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
                    <button
                        type="button"
                        className="es-close"
                        onClick={onClose}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="es-body">
                    <div>
                        <label className="es-label">Select Service</label>
                        <select
                            className="es-select"
                            value={selectedService}
                            onChange={(e) => handleSelect(e.target.value)}
                        >
                            <option value="">Choose a service to edit</option>
                            {services.map((s) => (
                                <option key={s._id} value={s._id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedObj && (
                        <div className="es-selected-badge">
                            <div className="es-selected-badge-icon">
                                <Pencil size={11} />
                            </div>
                            <span>{selectedObj.name}</span>
                            <Check
                                size={13}
                                style={{
                                    marginLeft: "auto",
                                    color: "#a78bfa",
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label className="es-label">
                            Service Amount{" "}
                            <IndianRupee
                                size={10}
                                style={{ display: "inline" }}
                            />
                        </label>
                        <div className="es-input-wrap">
                            <span className="es-input-prefix">
                                <IndianRupee size={13} />
                            </span>
                            <input
                                type="number"
                                className="es-input"
                                placeholder="Enter amount"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="0"
                                disabled={!selectedService}
                            />
                        </div>
                        {!selectedService && (
                            <div className="es-hint">
                                ◦ Select a service above to edit its details
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="es-footer">
                    <button
                        type="button"
                        className="es-btn es-btn-cancel"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="es-btn es-btn-submit"
                        onClick={handleSubmit}
                        disabled={!selectedService}
                    >
                        <Check size={13} /> Update Service
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditService;
