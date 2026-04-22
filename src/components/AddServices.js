import { useState } from "react";
import { authFetch } from "./authfetch";
import { FileText, X, Plus } from "lucide-react";
import { API_BASE_URL } from "../components/config";
import SuccessOverlay from "./SuccessOverlay";
// import "../css/Fxsuccess.css";
import "../css/Addservice.css";

const AddServices = (props) => {
    const [service, setService] = useState({ name: "", amount: "" });
    const [showSuccess, setShowSuccess] = useState(false); // ← added
    const { name, amount } = service;

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const payload = {
                name: name.trim(),
                ...(amount !== "" && { amount: Number(amount) }),
            };

            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/services/create_service`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            const json = await response.json();

            if (json.success) {
                setService({ name: "", amount: "" });
                setShowSuccess(true); // ← trigger animation
            } else {
                props.showAlert(
                    json.error || "Service already exists",
                    "danger",
                );
            }
        } catch (err) {
            console.error("Create service error:", err);
            props.showAlert("Server error. Try again.", "danger");
        }
    };

    const onChange = (e) =>
        setService({ ...service, [e.target.name]: e.target.value });

    return (
        <form onSubmit={handleSubmit}>
            <div className="as-modal" style={{ position: "relative" }}>
                {/* ── Futuristic success overlay ── */}
                <SuccessOverlay
                    visible={showSuccess}
                    onDone={() => {
                        setShowSuccess(false);
                        props.showAlert(
                            "Service added successfully",
                            "success",
                        );
                    }}
                    title="Service Added"
                    sub="Ready to assign"
                    variant="green"
                    duration={1800}
                />

                {/* Header */}
                <div className="as-header">
                    <div className="as-header-left">
                        <div className="as-icon">
                            <FileText size={16} />
                        </div>
                        <div className="as-title">
                            Add <em>Service</em>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="as-close"
                        onClick={props.onClose}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Body */}
                <div className="as-body">
                    <div className="as-field">
                        <label htmlFor="service-name" className="as-label">
                            Service Name <span className="as-required">*</span>
                        </label>
                        <div className="as-input-wrap">
                            <span className="as-input-icon">
                                <FileText size={14} />
                            </span>
                            <input
                                id="service-name"
                                name="name"
                                type="text"
                                autoComplete="off"
                                className="as-input"
                                placeholder="e.g. Consultation, X-Ray, ECG"
                                required
                                onChange={onChange}
                                value={name}
                            />
                        </div>
                    </div>

                    <div className="as-field">
                        <label htmlFor="service-amount" className="as-label">
                            Amount
                        </label>
                        <div className="as-input-wrap">
                            <span className="as-input-icon">
                                {props.currency?.symbol}
                            </span>
                            <input
                                id="service-amount"
                                name="amount"
                                type="number"
                                autoComplete="off"
                                className="as-input"
                                placeholder="Leave empty if price varies"
                                min="0"
                                onChange={onChange}
                                value={amount}
                            />
                        </div>
                        <div className="as-hint">
                            ◦ Leave empty if the service price varies per
                            patient
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="as-footer">
                    <button
                        type="button"
                        className="as-btn as-btn-cancel"
                        onClick={props.onClose}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="as-btn as-btn-submit">
                        <Plus size={13} /> Add Service
                    </button>
                </div>
            </div>
        </form>
    );
};

export default AddServices;
