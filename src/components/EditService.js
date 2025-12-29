import { useState, useEffect } from "react";
import { authFetch } from "./authfetch";

const EditService = ({ showAlert }) => {
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState("");
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    // Fetch all services on load
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await authFetch(
                    `${API_BASE_URL}/api/auth/fetchallservice`,);

                const data = await response.json();

                // ✅ HANDLE BOTH RESPONSE TYPES
                if (Array.isArray(data)) {
                    setServices(data);
                } else if (Array.isArray(data.services)) {
                    setServices(data.services);
                } else {
                    setServices([]);
                }
            } catch (err) {
                console.error("Error fetching services:", err);
                setServices([]);
            }
        };

        fetchServices();
    }, []);

    // Set form fields when selecting a service
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
            showAlert("Please select a service to edit", "warning");
            return;
        }

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/auth/updateservice/${selectedService}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name, amount }),
                }
            );

            const data = await response.json();
            if (data.success) {
                showAlert("Service updated successfully", "success");
                window.location.reload();
            } else {
                showAlert("Failed to update service", "danger");
            }
        } catch (err) {
            console.error("Error updating service:", err);
            showAlert("Error updating service", "danger");
        }
    };

    return (
        <div className="modal-content border-0 shadow-lg rounded-4">
            {/* HEADER */}
            <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-semibold d-flex align-items-center gap-2">
                    ✏️ Edit Service
                </h5>
                <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                />
            </div>

            {/* BODY */}
            <div className="modal-body pt-2">
                {/* Service Selector */}
                <div className="mb-3">
                    <label className="form-label small text-muted">
                        Select Service
                    </label>
                    <select
                        className="form-select rounded-3"
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
                </div>

                {/* Editable Fields */}
                <div className="form-floating mb-3">
                    <input
                        type="text"
                        className="form-control rounded-3"
                        id="editServiceName"
                        placeholder="Service Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={!selectedService}
                    />
                    <label htmlFor="editServiceName">Service Name</label>
                </div>

                <div className="form-floating">
                    <input
                        type="number"
                        className="form-control rounded-3"
                        id="editServiceAmount"
                        placeholder="Service Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min="0"
                        disabled={!selectedService}
                    />
                    <label htmlFor="editServiceAmount">
                        Service Amount (₹)
                    </label>
                </div>

                {!selectedService && (
                    <small className="text-muted d-block mt-2">
                        Please select a service to edit its details
                    </small>
                )}
            </div>

            {/* FOOTER */}
            <div className="modal-footer border-0 pt-0">
                <button
                    type="button"
                    className="btn btn-outline-secondary rounded-3"
                    data-bs-dismiss="modal"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-success rounded-3 px-4"
                    onClick={handleSubmit}
                    disabled={!selectedService}
                >
                    💾 Update Service
                </button>
            </div>
        </div>
    );
};

export default EditService;
