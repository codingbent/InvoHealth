import { useState, useEffect } from "react";
import { X, Check, CalendarArrowDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { authFetch } from "./authfetch";
import { API_BASE_URL } from "../components/config";
import { fetchCountries } from "../api/country.api";

// ── Helpers ───────────────────────────────────────────────────────────────────

const computeAgeFromDob = (dobStr) => {
    if (!dobStr) return null;
    const birth = new Date(`${dobStr}T00:00:00`);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 && age <= 120 ? age : null;
};

const estimateDobFromAge = (ageNum) => {
    if (ageNum === null || ageNum === undefined || ageNum === "") return "";
    const year = new Date().getFullYear() - ageNum;
    return `${year}-01-01`;
};

// ─────────────────────────────────────────────────────────────────────────────

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
        age: "", // editable — linked to dob
        gender: "",
        countryId: "",
    });
    const [saving, setSaving] = useState(false);
    const [showDobPicker, setShowDobPicker] = useState(false);
    const [countries, setCountries] = useState([]);

    // ── Pre-fill ──────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!details) return;

        const rawDob =
            details.dob && !isNaN(new Date(details.dob).getTime())
                ? new Date(details.dob).toISOString().split("T")[0]
                : "";

        // Prefer age stored in DB; fall back to computing it from DOB
        const storedAge =
            details.age !== undefined && details.age !== null
                ? String(details.age)
                : rawDob
                  ? String(computeAgeFromDob(rawDob) ?? "")
                  : "";

        setPatient({
            name: details.name || "",
            number: fullNumber || "",
            countryId: details.countryId || details.country?._id || "",
            email: details.email || "",
            dob: rawDob,
            age: storedAge,
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

    // ── Linked DOB change ─────────────────────────────────────────────────────
    const handleDobSelect = (dateStr) => {
        setPatient((prev) => ({ ...prev, dob: dateStr }));
        const computed = computeAgeFromDob(dateStr);
        if (computed !== null) {
            setPatient((prev) => ({
                ...prev,
                dob: dateStr,
                age: String(computed),
            }));
        }
        setShowDobPicker(false);
    };

    // ── Linked Age change ─────────────────────────────────────────────────────
    const handleAgeChange = (val) => {
        if (val === "") {
            setPatient((prev) => ({ ...prev, age: "" }));
            return;
        }
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 0 || num > 120) return;
        setPatient((prev) => ({
            ...prev,
            age: String(num),
            dob: estimateDobFromAge(num),
        }));
    };

    const handleChange = (e) =>
        setPatient((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const name = patient.name.trim();
        const email = patient.email.trim();
        const cleanNumber = patient.number.trim().replace(/\D/g, "");

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

        // Either DOB or age must be provided
        if (!patient.dob && !patient.age) {
            showAlert("Date of birth or age is required", "warning");
            return;
        }
        if (patient.dob) {
            const birthDate = new Date(patient.dob);
            if (isNaN(birthDate.getTime())) {
                showAlert("Invalid date of birth", "warning");
                return;
            }
            if (birthDate > new Date()) {
                showAlert("DOB cannot be a future date", "warning");
                return;
            }
        }

        if (!patient.gender) {
            showAlert("Gender is required", "warning");
            return;
        }
        if (!patient.countryId) {
            showAlert("Select country", "warning");
            return;
        }
        if (cleanNumber && !/^\d{7,15}$/.test(cleanNumber)) {
            showAlert("Enter valid phone number (7–15 digits)", "warning");
            return;
        }
        if (email) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                showAlert("Enter valid email address", "warning");
                return;
            }
            if (email.length > 254) {
                showAlert("Email too long", "warning");
                return;
            }
        }

        // Derive final DOB — if age-only, estimate Jan 1 of birth year
        const finalDob =
            patient.dob || estimateDobFromAge(parseInt(patient.age, 10));

        setSaving(true);

        try {
            const payload = {
                name: patient.name.trim(),
                countryId: patient.countryId,
                gender: patient.gender,
                email: patient.email.trim(),
            };

            if (finalDob) payload.dob = finalDob;
            if (patient.age !== "") payload.age = parseInt(patient.age, 10);
            if (cleanNumber) payload.number = cleanNumber;

            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/update_patient/${patientId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );

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

    // ── Render ────────────────────────────────────────────────────────────────
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
                    {/* Name */}
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

                    {/* Phone */}
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
                            <div
                                style={{
                                    width: 1,
                                    height: 24,
                                    background: "#2e3d5c",
                                }}
                            />
                            <input
                                className="pd-input"
                                type="tel"
                                name="number"
                                placeholder="Mobile number"
                                value={patient.number}
                                onChange={(e) => {
                                    const digits = e.target.value.replace(
                                        /\D/g,
                                        "",
                                    );
                                    if (digits.length <= 15)
                                        setPatient((prev) => ({
                                            ...prev,
                                            number: digits,
                                        }));
                                }}
                                style={{
                                    border: "none",
                                    outline: "none",
                                    flex: 1,
                                    padding: "8px 10px",
                                    background: "transparent",
                                    color: "#c5d0e8",
                                    marginBottom: 0,
                                }}
                            />
                        </div>
                    </div>

                    {/* Email */}
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

                    {/* DOB + Age — linked pair */}
                    <div className="pd-field">
                        <label className="pd-label">
                            Date of Birth &amp; Age
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                            <span className="pd-label-hint">
                                {" "}
                                — enter either, the other fills automatically
                            </span>
                        </label>

                        <div className="pd-dob-age-row">
                            {/* DOB picker */}
                            <div
                                style={{
                                    flex: 1,
                                    position: "relative",
                                    minWidth: 0,
                                }}
                            >
                                <button
                                    type="button"
                                    className="pd-input pd-dob-btn"
                                    onClick={() => setShowDobPicker((p) => !p)}
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
                                        size={15}
                                        style={{
                                            color: "#3a4a6b",
                                            flexShrink: 0,
                                        }}
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
                                                handleDobSelect(localDate);
                                            }}
                                            disabled={(date) =>
                                                date > new Date()
                                            }
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Age input — editable */}
                            <div className="pd-age-wrap">
                                <input
                                    type="number"
                                    className="pd-input pd-age-input"
                                    placeholder="Age"
                                    value={patient.age}
                                    min={0}
                                    max={120}
                                    onChange={(e) =>
                                        handleAgeChange(e.target.value)
                                    }
                                />
                                {patient.age !== "" && (
                                    <span className="pd-age-unit">yrs</span>
                                )}
                            </div>
                        </div>

                        {/* Hint when only age is set */}
                        {patient.age !== "" && !patient.dob && (
                            <div className="pd-age-hint">
                                DOB estimated as Jan 1,{" "}
                                {new Date().getFullYear() -
                                    parseInt(patient.age, 10)}
                            </div>
                        )}
                    </div>

                    {/* Gender */}
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
