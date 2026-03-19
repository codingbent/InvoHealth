import { useState, useEffect, useCallback, useMemo } from "react";
import { authFetch } from "./authfetch";
import { Pencil, IndianRupee } from "lucide-react";
import { useNavigate } from "react-router";

const EditService = ({ showAlert }) => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState("");
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const navigate = useNavigate();
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

                const modalEl = document.getElementById("editServiceModal");
                const modalInstance =
                    window.bootstrap.Modal.getInstance(modalEl);
                modalInstance?.hide();

                setSelectedService("");
                setName("");
                setAmount("");
                window.location.reload();
            } else {
                showAlert("Failed to update service", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Error updating service", "danger");
        }
    };

    return (
        <div className="edit-service-modal shadow-lg rounded-4">
            <div className="modal-header border-0">
                <h5 className="modal-title d-flex align-items-center gap-2">
                    <Pencil size={18} />
                    Edit Service
                </h5>

                <button
                    type="button"
                    className="btn-close btn-close-white"
                    data-bs-dismiss="modal"
                />
            </div>

            <div className="modal-body">
                {/* Service selector */}

                <label className="form-label text-theme-secondary small">
                    Select Service
                </label>

                <select
                    className="form-select theme-input mb-3"
                    value={selectedService}
                    onChange={(e) => handleSelect(e.target.value)}
                >
                    <option value="">Choose service</option>

                    {services.map((s) => (
                        <option key={s._id} value={s._id}>
                            {s.name}
                        </option>
                    ))}
                </select>

                {/* Service amount */}

                <div className="form-floating">
                    <input
                        type="number"
                        className="form-control theme-input"
                        id="editServiceAmount"
                        placeholder="Service Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        disabled={!selectedService}
                    />

                    <label htmlFor="editServiceAmount">
                        Service Amount
                        <IndianRupee size={14} className="ms-1" />
                    </label>
                </div>

                {!selectedService && (
                    <small className="text-theme-secondary d-block mt-2">
                        Select a service to edit
                    </small>
                )}
            </div>

            <div className="modal-footer border-0">
                <button
                    className="btn btn-outline-secondary"
                    data-bs-dismiss="modal"
                >
                    Cancel
                </button>
                <button
                    className="btn btn-primary px-4"
                    onClick={handleSubmit}
                    disabled={!selectedService}
                >
                    <Pencil size={16} className="me-1" />
                    Update
                </button>
            </div>
        </div>
    );
};

export default EditService;
