import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { authFetch } from "./authfetch";
import { API_BASE_URL } from "../components/config";

const EditPatient = ({
    patientId,
    details,
    fullNumber,
    showAlert,
    onClose,
    onSaved,
}) => {
    const [patient, setPatient] = useState({
        name: "",
        number: "",
        email: "",
        age: "",
        gender: "",
    });
    const [saving, setSaving] = useState(false);

    // Pre-fill form when details or the revealed phone number change
    useEffect(() => {
        if (!details) return;
        setPatient({
            name: details.name || "",
            number: fullNumber || "",
            email: details.email || "",
            age: details.age || "",
            gender: details.gender || "Male",
        });
    }, [details, fullNumber]);

    const handleChange = (e) =>
        setPatient((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        if (!patient.name.trim()) {
            showAlert("Name is required", "warning");
            return;
        }
        if (!patient.age) {
            showAlert("Age is required", "warning");
            return;
        }
        if (!patient.gender) {
            showAlert("Gender is required", "warning");
            return;
        }
        if (patient.number && !/^\d{10}$/.test(patient.number.trim())) {
            showAlert("Enter a valid 10-digit mobile number", "warning");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: patient.name.trim(),
                age: patient.age,
                gender: patient.gender,
                email: patient.email.trim(),
            };

            // Only send number if the user actually typed one
            if (patient.number && patient.number.trim() !== "") {
                payload.number = patient.number.trim();
            }

            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/update_patient/${patientId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

            const result = await response.json();

            if (response.ok) {
                showAlert("Patient updated successfully", "success");
                onSaved?.();
                onClose?.();
            } else {
                showAlert(result.message || "Update failed", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Server error. Please try again.", "danger");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pd-modal-bg" onClick={onClose}>
            <div
                className="pd-modal pd-modal-sm"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pd-modal-header">
                    <div className="pd-modal-title">
                        Edit <em>Patient</em>
                    </div>
                    <button className="pd-modal-close" onClick={onClose}>
                        <X size={13} />
                    </button>
                </div>

                {/* Body */}
                <div className="pd-modal-body">
                    <div className="pd-field">
                        <label className="pd-label">
                            Name
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                        </label>
                        <input
                            className="pd-input"
                            type="text"
                            name="name"
                            value={patient.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="pd-field">
                        <label className="pd-label">
                            Mobile Number
                        </label>
                        <input
                            className="pd-input"
                            type="text"
                            name="number"
                            placeholder="10-digit mobile number"
                            value={patient.number}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="pd-field">
                        <label className="pd-label">Email</label>
                        <input
                            className="pd-input"
                            type="email"
                            name="email"
                            value={patient.email}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="pd-field">
                        <label className="pd-label">
                            Age
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                        </label>
                        <input
                            className="pd-input"
                            type="number"
                            name="age"
                            min={0}
                            max={150}
                            value={patient.age}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="pd-field">
                        <label className="pd-label">
                            Gender
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                        </label>
                        <select
                            className="pd-select"
                            name="gender"
                            value={patient.gender}
                            onChange={handleChange}
                            style={{ marginBottom: 0 }}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="pd-modal-footer">
                    <button
                        className="pd-btn pd-btn-outline"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        className="pd-btn pd-btn-primary"
                        disabled={saving}
                        onClick={handleSave}
                    >
                        <Check size={13} />
                        {saving ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditPatient;