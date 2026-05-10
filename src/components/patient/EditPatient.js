import { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";
import "../../css/patient/EditProfileModal.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Calendar } from "lucide-react";

const EditProfileModal = ({ patient, onClose, onUpdate }) => {
    console.log(patient);

    const [form, setForm] = useState({
        name: patient.name || "",
        dob: patient.dob ? String(patient.dob).slice(0, 10) : "",
        gender: patient.gender || "",
        email: patient.email || "",
        number: patient.number || "",
        dialCode: patient.dialCode || "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState("form");
    const [otp, setOtp] = useState("");
    const [countries, setCountries] = useState([]);
    const [originalEmail] = useState(patient.email || "");
    const [emailVerified, setEmailVerified] = useState(true);
    const [showDobPicker, setShowDobPicker] = useState(false);
    const computedAge = form.dob
        ? (() => {
              const today = new Date();

              const birth = new Date(form.dob);

              let age = today.getFullYear() - birth.getFullYear();

              const monthDiff = today.getMonth() - birth.getMonth();

              if (
                  monthDiff < 0 ||
                  (monthDiff === 0 && today.getDate() < birth.getDate())
              ) {
                  age--;
              }

              return age >= 0 ? age : null;
          })()
        : null;

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/country`);
                const data = await res.json();
                setCountries(Array.isArray(data) ? data : data.countries || []);
            } catch (err) {
                console.error("Failed to load countries", err);
            }
        };

        loadCountries();
    }, []);

    const handleSendOtp = async () => {
        const token = localStorage.getItem("patient_token");

        const res = await fetch(
            `${API_BASE_URL}/api/patient/change-email/send-otp`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": token,
                },
                body: JSON.stringify({ email: form.email }),
            },
        );

        const data = await res.json();

        if (data.success) {
            setStep("otp");
        } else {
            setError(data.error);
        }
    };

    const handleVerifyOtp = async () => {
        const token = localStorage.getItem("patient_token");

        const res = await fetch(
            `${API_BASE_URL}/api/patient/change-email/verify`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": token,
                },
                body: JSON.stringify({
                    email: form.email,
                    otp,
                }),
            },
        );

        const data = await res.json();

        if (data.success) {
            setEmailVerified(true);
            setStep("form");
            onUpdate(data.patient);
            onClose();
        } else {
            setError(data.error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({ ...prev, [name]: value }));

        if (name === "email") {
            if (value.trim() !== originalEmail) {
                setEmailVerified(false);
                setStep("form"); // reset verification
            } else {
                setEmailVerified(true);
            }
        }

        setError("");
    };

    const handleSave = async () => {
        // Client-side validation
        if (!form.name.trim()) {
            setError("Name is required");
            return;
        }
        if (
            form.age &&
            (isNaN(form.age) || Number(form.age) < 0 || Number(form.age) > 150)
        ) {
            setError("Age must be between 0 and 150");
            return;
        }

        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
            setError("Invalid email format");
            return;
        }

        if (form.email.trim() !== originalEmail && !emailVerified) {
            setError("Please verify your new email before saving");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("patient_token");
            const cleanNumber = form.number?.replace(/\D/g, "");

            const payload = {
                name: form.name.trim(),
                ...(form.dob && { dob: form.dob }),
                ...(form.gender && { gender: form.gender }),
                ...(form.email && { email: form.email.trim() }),
                ...(cleanNumber && { number: cleanNumber }),
            };

            const res = await fetch(`${API_BASE_URL}/api/patient/update`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": token,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                if (data.emailChanged) {
                    localStorage.clear();
                    alert("Email updated. Please login again.");
                    window.location.href = "/patient/login";
                    return;
                }
                onUpdate(data.patient);
                onClose();
            } else {
                setError(data.error || "Failed to update. Please try again.");
            }
        } catch (err) {
            console.error("UPDATE ERROR:", err);

            if (err?.message) {
                setError(err.message);
            } else {
                setError("Something went wrong");
            }
        } finally {
            setLoading(false);
        }
    };

    // Close on overlay click
    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            if (form.email.trim() !== originalEmail && !emailVerified) {
                setError(
                    "All changes are not saved. Please verify email first.",
                );
                return;
            }
            onClose();
        }
    };

    return (
        <div className="ep-overlay" onClick={handleOverlayClick}>
            <div className="ep-modal">
                {/* HEADER */}
                <div className="ep-header">
                    <h3>Edit Profile</h3>
                    <button className="ep-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* BODY */}
                <div className="ep-body">
                    <Field label="Full name">
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            className="ep-input"
                        />
                    </Field>

                    <Field label="Date of Birth">
                        <div
                            style={{
                                position: "relative",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                }}
                            >
                                <button
                                    type="button"
                                    className="ep-input"
                                    onClick={() => setShowDobPicker((p) => !p)}
                                    style={{
                                        flex: 1,
                                        textAlign: "left",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <span>
                                        {form.dob
                                            ? new Date(
                                                  `${form.dob}T00:00:00`,
                                              ).toLocaleDateString(undefined, {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "Select DOB"}
                                    </span>

                                    <span>
                                        <Calendar size={18} />
                                    </span>
                                </button>

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
                                        }}
                                    >
                                        {computedAge} yrs
                                    </div>
                                )}
                            </div>

                            {showDobPicker && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: "calc(100% + 6px)",
                                        left: 0,
                                        zIndex: 100,
                                        background: "#081120",
                                        border: "1px solid #1e293b",
                                        borderRadius: 12,
                                        padding: 10,
                                    }}
                                >
                                    <DayPicker
                                        mode="single"
                                        captionLayout="dropdown"
                                        fromYear={1900}
                                        toYear={new Date().getFullYear()}
                                        month={
                                            form.dob
                                                ? new Date(form.dob)
                                                : new Date()
                                        }
                                        selected={
                                            form.dob
                                                ? new Date(form.dob)
                                                : undefined
                                        }
                                        disabled={(date) => date > new Date()}
                                        onSelect={(date) => {
                                            if (!date) return;

                                            const localDate = [
                                                date.getFullYear(),
                                                String(
                                                    date.getMonth() + 1,
                                                ).padStart(2, "0"),
                                                String(date.getDate()).padStart(
                                                    2,
                                                    "0",
                                                ),
                                            ].join("-");

                                            setForm((prev) => ({
                                                ...prev,
                                                dob: localDate,
                                            }));

                                            setShowDobPicker(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </Field>

                    <Field label="Gender">
                        <select
                            name="gender"
                            value={form.gender}
                            onChange={handleChange}
                            className="ep-input"
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </Field>

                    <Field label="Email">
                        <div className="ep-email-row">
                            <input
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                className="ep-input"
                            />
                            {form.email.trim() !== originalEmail &&
                                (emailVerified ? (
                                    <span className="ep-verified">
                                        ✓ Verified
                                    </span>
                                ) : (
                                    <button
                                        className="ep-verify"
                                        onClick={handleSendOtp}
                                    >
                                        Verify
                                    </button>
                                ))}
                        </div>
                    </Field>

                    {step === "otp" && (
                        <div className="ep-otp-box">
                            <input
                                placeholder="Enter OTP"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="ep-input"
                            />
                            <button
                                className="ep-confirm"
                                onClick={handleVerifyOtp}
                            >
                                Confirm
                            </button>
                        </div>
                    )}

                    <Field label="Phone">
                        <div className="ep-phone-row">
                            {/* Country dropdown */}
                            <select
                                name="dialCode"
                                value={form.dialCode}
                                onChange={handleChange}
                                className="ep-select"
                            >
                                {countries.map((c) => (
                                    <option key={c._id} value={c.dialCode}>
                                        {c.name} ({c.dialCode})
                                    </option>
                                ))}
                            </select>

                            {/* Number input */}
                            <input
                                name="number"
                                value={form.number}
                                onChange={handleChange}
                                className="ep-input"
                                placeholder="Enter phone number"
                            />
                        </div>
                    </Field>

                    {error && <div className="ep-error">{error}</div>}
                </div>

                {/* FOOTER */}
                <div className="ep-footer">
                    <button
                        className="ep-cancel"
                        onClick={() => {
                            if (
                                form.email.trim() !== originalEmail &&
                                !emailVerified
                            ) {
                                setError(
                                    "All changes are not saved. Please verify email first.",
                                );
                                return;
                            }
                            onClose();
                        }}
                    >
                        Cancel
                    </button>
                    <button className="ep-save" onClick={handleSave}>
                        {loading ? "Saving…" : "Save Changes"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label
            style={{
                display: "block",
                fontSize: 12,
                color: "#6b7280",
                marginBottom: 5,
                fontWeight: 500,
            }}
        >
            {label}
        </label>
        {children}
    </div>
);

export default EditProfileModal;
