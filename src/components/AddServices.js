import { useState } from "react";
import { authFetch } from "./authfetch";

const AddServices = (props) => {
    const [service, setService] = useState({ name: "", amount: "" });
    const { name, amount } = service;

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/auth/createservice`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ name, amount }),
                }
            );

            if (!response.ok) {
                throw new Error("Request failed");
            }

            const json = await response.json();

            if (json.success) {
                setService({ name: "", amount: "" });
                props.showAlert("Service added successfully", "success");
                document.querySelector("#serviceModal .btn-close")?.click();
            } else {
                props.showAlert(
                    json.error || "Service already exists",
                    "danger"
                );
            }
        } catch (err) {
            console.error("Create service error:", err);
            props.showAlert("Server error. Try again.", "danger");
        }
    };
    const onChange = (e) => {
        setService({ ...service, [e.target.name]: e.target.value });
    };
    return (
        <form onSubmit={handleSubmit}>
            <div className="modal-content border-0 shadow-lg rounded-4">
                {/* HEADER */}
                <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-semibold d-flex align-items-center gap-2">
                        🧾 Add New Service
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
                    {/* Service Name */}
                    <div className="form-floating mb-3">
                        <input
                            type="text"
                            className="form-control rounded-3"
                            id="serviceName"
                            placeholder="Service Name"
                            name="name"
                            required
                            onChange={onChange}
                            value={name}
                        />
                        <label htmlFor="serviceName">Service Name *</label>
                    </div>

                    {/* Amount */}
                    <div className="form-floating">
                        <input
                            type="number"
                            className="form-control rounded-3"
                            id="serviceAmount"
                            placeholder="Amount"
                            name="amount"
                            min="0"
                            onChange={onChange}
                            value={amount}
                        />
                        <label htmlFor="serviceAmount">Amount (optional)</label>
                    </div>

                    <small className="text-muted d-block mt-2">
                        Leave amount empty if service price varies
                    </small>
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
                        type="submit"
                        className="btn btn-primary rounded-3 px-4"
                    >
                        ➕ Add Service
                    </button>
                </div>
            </div>
        </form>
    );
};

export default AddServices;
