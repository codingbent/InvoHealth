import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { authFetch } from "./authfetch";
import { API_BASE_URL } from "../components/config";
import { fetchCountries } from "../api/country.api";

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
        countryId: "",
    });
    const [saving, setSaving] = useState(false);
    const [countries, setCountries] = useState([]);

    // Pre-fill form when details or the revealed phone number change
    useEffect(() => {
        if (!details) return;

        setPatient({
            name: details.name || "",
            number: fullNumber || "",
            countryId: details.countryId || details.country?._id || "",
            email: details.email || "",
            age: details.age || "",
            gender: details.gender || "Male",
        });
    }, [details, fullNumber]);

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const data = await fetchCountries();
                setCountries(data || []);
            } catch (err) {
                console.error("Failed to load countries", err);
            }
        };
        loadCountries();
    }, []);

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

        // FIX #5: Align phone regex with backend — 7-15 digits, no leading-zero restriction
        const cleanNumber = patient.number.trim().replace(/\D/g, "");
        if (cleanNumber && !/^\d{7,15}$/.test(cleanNumber)) {
            showAlert("Enter a valid phone number (7-15 digits)", "warning");
            return;
        }

        if (!patient.countryId) {
            showAlert("Select country", "warning");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                name: patient.name.trim(),
                countryId: patient.countryId,
                age: patient.age,
                gender: patient.gender,
                email: patient.email.trim(),
            };

            // FIX #11: Strip non-digits before sending so backend receives clean number
            if (cleanNumber !== "") {
                payload.number = cleanNumber;
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
                        <label className="pd-label">Mobile Number</label>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                border: "1px solid #1a2540",
                                borderRadius: 8,
                                overflow: "hidden",
                                background: "#080c18",
                            }}
                        >
                            {/* COUNTRY SELECTOR — value = country._id (ObjectId) */}
                            <select
                                className="dp-select"
                                value={patient.countryId || ""}
                                onChange={(e) =>
                                    setPatient((prev) => ({
                                        ...prev,
                                        countryId: e.target.value,
                                    }))
                                }
                                style={{
                                    border: "none",
                                    outline: "none",
                                    background: "transparent",
                                    padding: "8px 10px",
                                    color: "#c5d0e8",
                                    cursor: "pointer",
                                }}
                            >
                                <option value="">Select Country</option>
                                {countries.map((c) => (
                                    <option key={c._id} value={c._id}>
                                        {c.flag} {c.name} ({c.dialCode})
                                    </option>
                                ))}
                            </select>
                            {/* SEPARATOR */}
                            <div
                                style={{
                                    width: 1,
                                    height: 24,
                                    background: "#2e3d5c",
                                }}
                            />

                            {/* PHONE INPUT — digits only enforced in input handler */}
                            <input
                                className="pd-input"
                                type="tel"
                                name="number"
                                placeholder="Mobile number"
                                value={patient.number}
                                onChange={(e) => {
                                    // Strip non-digits on input so display stays clean
                                    const digits = e.target.value.replace(
                                        /\D/g,
                                        "",
                                    );
                                    if (digits.length <= 15) {
                                        setPatient((prev) => ({
                                            ...prev,
                                            number: digits,
                                        }));
                                    }
                                }}
                                style={{
                                    border: "none",
                                    outline: "none",
                                    flex: 1,
                                    padding: "8px 10px",
                                    background: "transparent",
                                    color: "#c5d0e8",
                                    marginBottom: "0px",
                                }}
                            />
                        </div>
                    </div>

                    <div className="pd-field">
                        <label className="pd-label">Email</label>
                        <input
                            className="pd-input"
                            type="email"
                            name="email"
                            value={patient.email}
                            placeholder="Enter E-mail"
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
                    <button className="pd-btn pd-btn-outline" onClick={onClose}>
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
