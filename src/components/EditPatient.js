import { useState, useEffect, useMemo } from "react";
import { X, Check, CalendarArrowDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
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
        dob: "",
        gender: "",
        countryId: "",
    });
    const [saving, setSaving] = useState(false);
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [countries, setCountries] = useState([]);

    // Pre-fill form when details or the revealed phone number change
    useEffect(() => {
        if (!details) return;

        setPatient({
            name: details.name || "",
            number: fullNumber || "",
            countryId: details.countryId || details.country?._id || "",
            email: details.email || "",
            dob:
                details.dob && !isNaN(new Date(details.dob).getTime())
                    ? new Date(details.dob).toISOString().split("T")[0]
                    : "",
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

    const computedAge = useMemo(() => {
        if (!patient.dob) return null;

        const today = new Date();

        const birth = new Date(`${patient.dob}T00:00:00`);

        if (isNaN(birth.getTime())) return null;

        let age = today.getFullYear() - birth.getFullYear();

        const monthDiff = today.getMonth() - birth.getMonth();

        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birth.getDate())
        ) {
            age--;
        }

        return age >= 0 ? age : null;
    }, [patient.dob]);

    const handleChange = (e) =>
        setPatient((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        // ── VALIDATION ─────────────────────────────────────────

        const name = patient.name.trim();
        const email = patient.email.trim();
        const cleanNumber = patient.number.trim().replace(/\D/g, "");

        // Name
        if (!name) {
            showAlert("Name is required", "warning");
            return;
        }
        if (name.length < 2 || name.length > 60) {
            showAlert("Name must be 2–60 characters", "warning");
            return;
        }
        if (/[<>]/.test(name)) {
            showAlert("Invalid characters in name", "warning");
            return;
        }

        if (!patient.dob) {
            showAlert("Date of birth is required", "warning");
            return;
        }

        const birthDate = new Date(patient.dob);

        if (isNaN(birthDate.getTime())) {
            showAlert("Invalid DOB", "warning");
            return;
        }

        if (birthDate > new Date()) {
            showAlert("DOB cannot be future date", "warning");
            return;
        }

        // Gender
        if (!patient.gender) {
            showAlert("Gender is required", "warning");
            return;
        }

        // Country
        if (!patient.countryId) {
            showAlert("Select country", "warning");
            return;
        }

        // Phone (optional but strict if provided)
        if (cleanNumber) {
            if (!/^\d{7,15}$/.test(cleanNumber)) {
                showAlert("Enter valid phone number (7-15 digits)", "warning");
                return;
            }
        }

        // Email (optional but strict if provided)
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

            if (!emailRegex.test(email)) {
                showAlert("Enter valid email address", "warning");
                return;
            }

            if (email.length > 254) {
                showAlert("Email too long", "warning");
                return;
            }
        }

        setSaving(true);

        try {
            const payload = {
                name: patient.name.trim(),
                countryId: patient.countryId,
                dob: patient.dob,
                gender: patient.gender,
                email: patient.email.trim(),
            };

            if (cleanNumber) {
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

            // SAFE PARSE
            let result;
            try {
                result = await response.json();
            } catch {
                throw new Error("Invalid server response");
            }

            if (response.ok && result.success) {
                showAlert("Patient updated", "success");
                onSaved?.();
                onClose?.();
            } else {
                showAlert(
                    result.error || result.message || "Update failed",
                    "danger",
                );
            }
        } catch (err) {
            console.error("UPDATE ERROR:", err);
            showAlert("Server not responding", "danger");
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
                            Date of Birth
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                        </label>

                        <div
                            style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                            }}
                        >
                            <div style={{ flex: 1, position: "relative" }}>
                                <button
                                    type="button"
                                    className="pd-input"
                                    onClick={() => setShowDobPicker((p) => !p)}
                                    style={{
                                        width: "100%",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 0,
                                    }}
                                >
                                    <span
                                        style={{
                                            color: patient.dob
                                                ? "#c5d0e8"
                                                : "#6b7fa8",
                                        }}
                                    >
                                        {patient.dob
                                            ? new Date(
                                                  `${patient.dob}T00:00:00`,
                                              ).toLocaleDateString(undefined, {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "Select DOB"}
                                    </span>

                                    <CalendarArrowDown
                                        size={16}
                                        style={{ color: "#3a4a6b" }}
                                    />
                                </button>

                                {showDobPicker && (
                                    <div
                                        className="dp-wrapper"
                                        style={{
                                            position: "absolute",
                                            top: "calc(100% + 6px)",
                                            left: 0,
                                            zIndex: 999,
                                        }}
                                    >
                                        <DayPicker
                                            mode="single"
                                            captionLayout="dropdown"
                                            fromYear={1900}
                                            toYear={new Date().getFullYear()}
                                            selected={
                                                patient.dob
                                                    ? new Date(
                                                          `${patient.dob}T00:00:00`,
                                                      )
                                                    : undefined
                                            }
                                            onSelect={(date) => {
                                                if (!date) return;

                                                const localDate = [
                                                    date.getFullYear(),
                                                    String(
                                                        date.getMonth() + 1,
                                                    ).padStart(2, "0"),
                                                    String(
                                                        date.getDate(),
                                                    ).padStart(2, "0"),
                                                ].join("-");

                                                setPatient((prev) => ({
                                                    ...prev,
                                                    dob: localDate,
                                                }));

                                                setShowDobPicker(false);
                                            }}
                                            disabled={(date) =>
                                                date > new Date()
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {computedAge !== null && (
                                <div
                                    style={{
                                        padding: "8px 10px",
                                        borderRadius: 8,
                                        background: "#111827",
                                        border: "1px solid #243041",
                                        color: "#c5d0e8",
                                        fontSize: 12,
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                    }}
                                >
                                    {computedAge} yrs
                                </div>
                            )}
                        </div>
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
