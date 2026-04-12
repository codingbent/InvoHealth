import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { authFetch } from "./authfetch";
import {
    UserPlus,
    Check,
    X,
    Plus,
    Trash2,
    Clock,
    Calendar,
    EyeOff,
    Eye,
    Mail,
    ShieldCheck,
    ChevronRight,
    ChevronLeft,
} from "lucide-react";

const normalizePhone = (phone) => phone.replace(/\D/g, "").slice(-10);
const isValidIndianMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STEPS = ["Account", "Clinic", "Schedule", "Professional"];

const passwordRules = {
    length: /.{8,}/,
    upper: /[A-Z]/,
    lower: /[a-z]/,
    number: /[0-9]/,
    special: /[^A-Za-z0-9]/,
};

const API_BASE_URL =
    process.env.NODE_ENV === "production"
        ? "https://gmsc-backend.onrender.com"
        : "http://localhost:5001";

function StepBar({ current }) {
    return (
        <div className="sg-stepbar">
            {STEPS.map((label, i) => {
                const num = i + 1;
                const done = num < current;
                const active = num === current;
                return (
                    <div key={label} className="sg-step-wrap">
                        <div className="sg-step-row">
                            <div
                                className={`sg-step-dot${done ? " done" : active ? " active" : ""}`}
                            >
                                {done ? <Check size={11} /> : num}
                            </div>
                            {/* Line goes AFTER the dot, inside sg-step-row,
                                so it stays on the same horizontal axis as the dot */}
                            {i < STEPS.length - 1 && (
                                <div
                                    className={`sg-step-line${done ? " done" : ""}`}
                                />
                            )}
                        </div>
                        <span
                            className={`sg-step-label${done ? " done" : active ? " active" : ""}`}
                        >
                            {label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* ─────────────────────────────────────────
   Reusable field wrapper
───────────────────────────────────────── */
function Field({ label, required, error, children, style }) {
    return (
        <div className="sg-field" style={style}>
            {label && (
                <label className="sg-label">
                    {label}
                    {required && <span className="sg-required"> *</span>}
                </label>
            )}
            {children}
            {error && <span className="sg-errtip">{error}</span>}
        </div>
    );
}

/* ─────────────────────────────────────────
   Alert banner
───────────────────────────────────────── */
function Alert({ msg, type, onClose }) {
    if (!msg) return null;
    return (
        <div className={`sg-alert sg-alert-${type}`}>
            {type === "success" ? <Check size={14} /> : <X size={14} />}
            <span>{msg}</span>
            <button className="sg-alert-close" onClick={onClose}>
                <X size={11} />
            </button>
        </div>
    );
}

/* ─────────────────────────────────────────
   Step 1 — Account Info + Email Verify
───────────────────────────────────────── */
function Step1({ data, onChange, onNext }) {
    const [showPw, setShowPw] = useState(false);
    const [showCpw, setShowCpw] = useState(false);
    const [pwChecks, setPwChecks] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
    });
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [emailVerified, setEmailVerified] = useState(
        data.emailVerified || false,
    );
    const [otpError, setOtpError] = useState("");
    const [alert, setAlert] = useState(null);
    const [errors, setErrors] = useState({});
    const otpRefs = useRef([]);
    const [sendingOtp, setSendingOtp] = useState(false);

    const showAlert = (msg, type) => {
        setAlert({ msg, type });
        setTimeout(() => setAlert(null), 4000);
    };

    const handlePwChange = (e) => {
        onChange(e);
        const val = e.target.value;
        setPwChecks({
            length: passwordRules.length.test(val),
            upper: passwordRules.upper.test(val),
            lower: passwordRules.lower.test(val),
            number: passwordRules.number.test(val),
            special: passwordRules.special.test(val),
        });
    };

    const passwordsMatch =
        data.password && data.cpassword && data.password === data.cpassword;

    const sendOtp = async () => {
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            setErrors((e) => ({ ...e, email: "Enter a valid email address" }));
            return;
        }

        try {
            setSendingOtp(true);
            setOtpError("");

            const res = await fetch(
                `${API_BASE_URL}/api/doctor/signup_send_otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: data.email }),
                },
            );

            const result = await res.json();

            if (!res.ok) {
                setErrors((e) => ({
                    ...e,
                    email: result.error || "Email already registered",
                }));
                return;
            }

            setOtpSent(true);
            setOtp(["", "", "", "", "", ""]);
            showAlert("OTP sent to " + data.email, "success");
        } catch (err) {
            setOtpError("Failed to send OTP. Try again.");
        } finally {
            setSendingOtp(false); // 🔥 stop animation
        }
    };

    const verifyOtp = async () => {
        const entered = otp.join("");
        if (entered.length !== 6) {
            setOtpError("Enter the complete 6-digit code");
            return;
        }
        try {
            setOtpError("");
            const res = await fetch(
                `${API_BASE_URL}/api/doctor/signup_verify_otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: data.email, otp: entered }),
                },
            );
            const json = await res.json();
            if (!res.ok) throw new Error("Failed");
            if (json.success) {
                setEmailVerified(true);
                setOtpSent(false);
                onChange({ target: { name: "emailVerified", value: true } });
                showAlert("Email verified successfully!", "success");
            } else {
                setOtpError(json.message || "Incorrect code");
            }
        } catch (err) {
            setOtpError("Verification failed. Try again.");
        }
    };

    const handleOtpInput = (i, val) => {
        val = val.replace(/\D/g, "").slice(0, 1);
        const next = [...otp];
        next[i] = val;
        setOtp(next);
        if (val && i < 5) otpRefs.current[i + 1]?.focus();
    };

    const handleOtpKeyDown = (i, e) => {
        if (e.key === "Backspace" && !otp[i] && i > 0)
            otpRefs.current[i - 1]?.focus();
    };

    const validate = () => {
        const errs = {};
        if (!data.name.trim()) errs.name = "Full name is required";
        if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
            errs.email = "Valid email is required";
        if (!emailVerified) errs.email = "Please verify your email first";
        if (!Object.values(pwChecks).every(Boolean))
            errs.password = "Password does not meet all requirements";
        if (!passwordsMatch) errs.cpassword = "Passwords do not match";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    return (
        <div>
            <Alert
                msg={alert?.msg}
                type={alert?.type}
                onClose={() => setAlert(null)}
            />

            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Account Information</span>
                <div className="sg-section-line" />
            </div>

            <div className="sg-row sg-row-2">
                <Field label="Full Name" required error={errors.name}>
                    <input
                        className={`sg-input${errors.name ? " sg-input-err" : ""}`}
                        name="name"
                        value={data.name}
                        onChange={onChange}
                        placeholder="Dr. John Doe"
                    />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                    <div className="sg-input-wrap">
                        <input
                            className={`sg-input${emailVerified ? " sg-input-ok" : errors.email ? " sg-input-err" : ""}`}
                            name="email"
                            type="email"
                            value={data.email}
                            onChange={onChange}
                            placeholder="email@clinic.com"
                            readOnly={emailVerified}
                            style={emailVerified ? { paddingRight: 36 } : {}}
                        />
                        {emailVerified && (
                            <span className="sg-verified-inline">
                                <Check size={13} />
                            </span>
                        )}
                    </div>
                </Field>
            </div>

            {!emailVerified && (
                <div className="sg-verify-box">
                    <div className="sg-verify-title">
                        <Mail size={13} /> Email Verification Required
                    </div>
                    <p className="sg-verify-desc">
                        We'll send a 6-digit code to confirm your email before
                        you proceed.
                    </p>
                    {!otpSent ? (
                        <button
                            type="button"
                            className="sg-btn sg-btn-outline sg-btn-sm flex items-center gap-2"
                            onClick={sendOtp}
                            disabled={sendingOtp}
                        >
                            {sendingOtp ? (
                                <>
                                    <span className="spinner"></span>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Mail size={12} /> Send Verification Code
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            <div className="sg-otp-wrap">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className="sg-otp-box"
                                        value={digit}
                                        onChange={(e) =>
                                            handleOtpInput(i, e.target.value)
                                        }
                                        onKeyDown={(e) =>
                                            handleOtpKeyDown(i, e)
                                        }
                                    />
                                ))}
                            </div>
                            {otpError && (
                                <div className="sg-errtip">{otpError}</div>
                            )}
                            <div
                                style={{
                                    display: "flex",
                                    gap: 8,
                                    marginTop: 10,
                                }}
                            >
                                <button
                                    type="button"
                                    className="sg-btn sg-btn-primary sg-btn-sm"
                                    onClick={verifyOtp}
                                    disabled={otp.join("").length !== 6}
                                >
                                    <ShieldCheck size={13} /> Verify Code
                                </button>
                                <button
                                    type="button"
                                    className="sg-btn sg-btn-outline sg-btn-sm"
                                    onClick={sendOtp}
                                >
                                    Resend
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {emailVerified && (
                <div className="sg-verified-badge">
                    <Check size={13} /> Email verified
                </div>
            )}

            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Password</span>
                <div className="sg-section-line" />
            </div>

            <div className="sg-row sg-row-2">
                <Field label="Password" required error={errors.password}>
                    <div className="sg-input-wrap">
                        <input
                            className={`sg-input has-eye${errors.password ? " sg-input-err" : ""}`}
                            type={showPw ? "text" : "password"}
                            name="password"
                            value={data.password}
                            onChange={handlePwChange}
                            placeholder="Create a strong password"
                        />
                        <button
                            type="button"
                            className="sg-eye-btn"
                            onClick={() => setShowPw((p) => !p)}
                        >
                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                </Field>

                <Field
                    label="Confirm Password"
                    required
                    error={errors.cpassword}
                >
                    <div className="sg-input-wrap">
                        <input
                            className={`sg-input has-eye${errors.cpassword ? " sg-input-err" : ""}`}
                            type={showCpw ? "text" : "password"}
                            name="cpassword"
                            value={data.cpassword}
                            onChange={onChange}
                            placeholder="Repeat password"
                        />
                        <button
                            type="button"
                            className="sg-eye-btn"
                            onClick={() => setShowCpw((p) => !p)}
                        >
                            {showCpw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                </Field>
            </div>

            <div className="sg-pw-checks">
                {[
                    { key: "length", label: "Min 8 characters" },
                    { key: "upper", label: "Uppercase letter" },
                    { key: "lower", label: "Lowercase letter" },
                    { key: "number", label: "Number" },
                    { key: "special", label: "Special character" },
                ].map((r) => (
                    <div
                        key={r.key}
                        className={`sg-pw-check ${pwChecks[r.key] ? "pass" : "fail"}`}
                    >
                        <span className="sg-pw-icon">
                            {pwChecks[r.key] ? (
                                <Check size={9} />
                            ) : (
                                <X size={9} />
                            )}
                        </span>
                        {r.label}
                    </div>
                ))}
                <div
                    className={`sg-pw-check ${passwordsMatch ? "pass" : "fail"}`}
                >
                    <span className="sg-pw-icon">
                        {passwordsMatch ? <Check size={9} /> : <X size={9} />}
                    </span>
                    Passwords match
                </div>
            </div>

            {/* Step 1 nav — no back button, so use a spacer to keep hint centred */}
            <div className="sg-nav">
                <div className="sg-nav-spacer" />
                <span className="sg-nav-hint">Step 1 of 4</span>
                <button
                    type="button"
                    className="sg-btn sg-btn-primary"
                    onClick={() => validate() && onNext()}
                >
                    Continue <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Step 2 — Clinic Info + Address
───────────────────────────────────────── */
function Step2({ data, onChange, onNext, onBack }) {
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!data.clinicName.trim())
            errs.clinicName = "Clinic name is required";
        const ph = normalizePhone(data.phone);
        if (!isValidIndianMobile(ph))
            errs.phone = "Enter a valid 10-digit Indian mobile number";
        const aph = normalizePhone(data.secondaryPhone);
        if (!isValidIndianMobile(aph))
            errs.secondaryPhone = "Enter a valid appointment contact number";
        if (!data.street.trim()) errs.street = "Address Line 1 is required";
        if (!data.city.trim()) errs.city = "City is required";
        if (!data.state.trim()) errs.state = "State is required";
        if (!/^\d{6}$/.test(data.pincode))
            errs.pincode = "Enter a valid 6-digit pincode";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    return (
        <div>
            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Clinic Information</span>
                <div className="sg-section-line" />
            </div>

            <Field
                label="Clinic / Hospital Name"
                required
                error={errors.clinicName}
            >
                <input
                    className={`sg-input${errors.clinicName ? " sg-input-err" : ""}`}
                    name="clinicName"
                    value={data.clinicName}
                    onChange={onChange}
                    placeholder="City Medical Centre"
                />
            </Field>

            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Contact Numbers</span>
                <div className="sg-section-line" />
            </div>

            <div className="sg-row sg-row-2">
                <Field label="Doctor Contact" required error={errors.phone}>
                    <input
                        className={`sg-input${errors.phone ? " sg-input-err" : ""}`}
                        name="phone"
                        value={data.phone}
                        onChange={onChange}
                        placeholder="10-digit mobile number"
                        maxLength={15}
                    />
                </Field>
                <Field
                    label="Appointment Contact"
                    required
                    error={errors.secondaryPhone}
                >
                    <input
                        className={`sg-input${errors.secondaryPhone ? " sg-input-err" : ""}`}
                        name="secondaryPhone"
                        value={data.secondaryPhone}
                        onChange={onChange}
                        placeholder="Public booking number"
                        maxLength={15}
                    />
                </Field>
            </div>

            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Clinic Address</span>
                <div className="sg-section-line" />
            </div>

            <Field error={errors.street} style={{ marginBottom: 10 }}>
                <input
                    className={`sg-input${errors.street ? " sg-input-err" : ""}`}
                    name="street"
                    value={data.street}
                    onChange={onChange}
                    placeholder="Address Line 1 *"
                />
            </Field>
            <div className="sg-field" style={{ marginBottom: 10 }}>
                <input
                    className="sg-input"
                    name="street2"
                    value={data.street2}
                    onChange={onChange}
                    placeholder="Address Line 2 (optional)"
                />
            </div>
            <div className="sg-field" style={{ marginBottom: 10 }}>
                <input
                    className="sg-input"
                    name="street3"
                    value={data.street3}
                    onChange={onChange}
                    placeholder="Address Line 3 (optional)"
                />
            </div>
            <div className="sg-row sg-row-2" style={{ marginBottom: 10 }}>
                <div>
                    <input
                        className={`sg-input${errors.city ? " sg-input-err" : ""}`}
                        name="city"
                        value={data.city}
                        onChange={onChange}
                        placeholder="City *"
                    />
                    {errors.city && (
                        <span className="sg-errtip">{errors.city}</span>
                    )}
                </div>
                <div>
                    <input
                        className={`sg-input${errors.state ? " sg-input-err" : ""}`}
                        name="state"
                        value={data.state}
                        onChange={onChange}
                        placeholder="State *"
                    />
                    {errors.state && (
                        <span className="sg-errtip">{errors.state}</span>
                    )}
                </div>
            </div>
            <Field error={errors.pincode}>
                <input
                    className={`sg-input${errors.pincode ? " sg-input-err" : ""}`}
                    name="pincode"
                    value={data.pincode}
                    onChange={(e) =>
                        onChange({
                            target: {
                                name: "pincode",
                                value: e.target.value.replace(/\D/g, ""),
                            },
                        })
                    }
                    placeholder="Pincode *"
                    maxLength={6}
                />
            </Field>

            <div className="sg-nav">
                <button
                    type="button"
                    className="sg-btn sg-btn-outline"
                    onClick={onBack}
                >
                    <ChevronLeft size={14} /> Back
                </button>
                <span className="sg-nav-hint">Step 2 of 4</span>
                <button
                    type="button"
                    className="sg-btn sg-btn-primary"
                    onClick={() => validate() && onNext()}
                >
                    Continue <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Step 3 — Availability
───────────────────────────────────────── */
function Step3({ availability, setAvailability, onNext, onBack }) {
    const [alert, setAlert] = useState(null);

    const showAlert = (msg, type) => {
        setAlert({ msg, type });
        setTimeout(() => setAlert(null), 4000);
    };

    const updateSlot = (bi, si, field, value) => {
        const updated = availability.map((b, i) =>
            i !== bi
                ? b
                : {
                      ...b,
                      slots: b.slots.map((s, j) =>
                          j !== si ? s : { ...s, [field]: value },
                      ),
                  },
        );
        setAvailability(updated);
    };

    const addSlot = (bi) => {
        const updated = availability.map((b, i) =>
            i !== bi
                ? b
                : {
                      ...b,
                      slots: [
                          ...b.slots,
                          { startTime: "", endTime: "", slotDuration: 15 },
                      ],
                  },
        );
        setAvailability(updated);
    };

    const removeSlot = (bi, si) => {
        const updated = availability.map((b, i) =>
            i !== bi || b.slots.length === 1
                ? b
                : { ...b, slots: b.slots.filter((_, j) => j !== si) },
        );
        setAvailability(updated);
    };

    const toggleDay = (bi, day) => {
        const updated = availability.map((b, i) =>
            i !== bi
                ? b
                : {
                      ...b,
                      days: b.days.includes(day)
                          ? b.days.filter((d) => d !== day)
                          : [...b.days, day],
                  },
        );
        setAvailability(updated);
    };

    const addBlock = () => {
        setAvailability([
            ...availability,
            {
                days: [],
                slots: [{ startTime: "", endTime: "", slotDuration: 15 }],
            },
        ]);
    };

    const removeBlock = (bi) => {
        if (availability.length === 1) return;
        setAvailability(availability.filter((_, i) => i !== bi));
    };

    function isOverlapping(slots) {
        for (let i = 0; i < slots.length; i++)
            for (let j = i + 1; j < slots.length; j++)
                if (
                    slots[i].startTime < slots[j].endTime &&
                    slots[j].startTime < slots[i].endTime
                )
                    return true;
        return false;
    }

    const validate = () => {
        if (availability.every((b) => b.days.length === 0)) {
            showAlert("Add at least one working day", "error");
            return false;
        }
        for (const [bi, block] of availability.entries()) {
            if (block.days.length === 0) continue;
            for (const slot of block.slots) {
                if (!slot.startTime || !slot.endTime) {
                    showAlert(
                        `Fill all time slots in group ${bi + 1}`,
                        "error",
                    );
                    return false;
                }
                if (slot.startTime >= slot.endTime) {
                    showAlert(
                        `Start must be before end in group ${bi + 1}`,
                        "error",
                    );
                    return false;
                }
            }
            if (isOverlapping(block.slots)) {
                showAlert(`Overlapping time slots in group ${bi + 1}`, "error");
                return false;
            }
        }
        return true;
    };

    return (
        <div>
            <Alert
                msg={alert?.msg}
                type={alert?.type}
                onClose={() => setAlert(null)}
            />

            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">
                    Availability & Schedule
                </span>
                <div className="sg-section-line" />
            </div>

            {availability.map((block, bi) => (
                <div key={bi} className="sg-avail-block">
                    <div className="sg-avail-header">
                        <span className="sg-avail-title">
                            <Calendar
                                size={12}
                                style={{ display: "inline", marginRight: 5 }}
                            />
                            Slot {bi + 1}
                        </span>
                        {availability.length > 1 && (
                            <button
                                type="button"
                                className="sg-btn sg-btn-danger sg-btn-sm"
                                onClick={() => removeBlock(bi)}
                            >
                                <Trash2 size={11} /> Remove
                            </button>
                        )}
                    </div>

                    <div className="sg-days">
                        {DAYS.map((day) => (
                            <button
                                type="button"
                                key={day}
                                className={`sg-day${block.days.includes(day) ? " active" : ""}`}
                                onClick={() => toggleDay(bi, day)}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    {block.slots.map((slot, si) => (
                        <div key={si}>
                            <div className="sg-slot-row">
                                <div className="sg-field">
                                    <label className="sg-label">Start</label>
                                    <input
                                        type="time"
                                        className="sg-input"
                                        value={slot.startTime}
                                        onChange={(e) =>
                                            updateSlot(
                                                bi,
                                                si,
                                                "startTime",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="sg-field">
                                    <label className="sg-label">End</label>
                                    <input
                                        type="time"
                                        className="sg-input"
                                        value={slot.endTime}
                                        onChange={(e) =>
                                            updateSlot(
                                                bi,
                                                si,
                                                "endTime",
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="sg-field">
                                    <label className="sg-label">Gap</label>
                                    <select
                                        className="sg-select"
                                        value={slot.slotDuration}
                                        onChange={(e) =>
                                            updateSlot(
                                                bi,
                                                si,
                                                "slotDuration",
                                                Number(e.target.value),
                                            )
                                        }
                                    >
                                        {[10, 15, 20, 30].map((v) => (
                                            <option key={v} value={v}>
                                                {v} min
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ paddingBottom: 2 }}>
                                    {block.slots.length > 1 && (
                                        <button
                                            type="button"
                                            className="sg-btn sg-btn-danger sg-btn-sm"
                                            onClick={() => removeSlot(bi, si)}
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {slot.startTime && slot.endTime && (
                                <div className="sg-slot-preview">
                                    <Clock size={10} /> {slot.startTime} →{" "}
                                    {slot.endTime} · {slot.slotDuration} min
                                    slots
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        type="button"
                        className="sg-btn sg-btn-outline sg-btn-sm"
                        style={{ marginTop: 12 }}
                        onClick={() => addSlot(bi)}
                    >
                        <Plus size={11} /> Add Time Slot
                    </button>
                </div>
            ))}

            <button
                type="button"
                className="sg-btn sg-btn-outline"
                style={{ marginTop: 4 }}
                onClick={addBlock}
            >
                <Plus size={13} /> Add Day Group
            </button>

            <div className="sg-nav">
                <button
                    type="button"
                    className="sg-btn sg-btn-outline"
                    onClick={onBack}
                >
                    <ChevronLeft size={14} /> Back
                </button>
                <span className="sg-nav-hint">Step 3 of 4</span>
                <button
                    type="button"
                    className="sg-btn sg-btn-primary"
                    onClick={() => validate() && onNext()}
                >
                    Continue <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Step 4 — Professional Details + Submit
───────────────────────────────────────── */
function Step4({
    data,
    onChange,
    degrees,
    setDegrees,
    acceptedTerms,
    setAcceptedTerms,
    onBack,
    onSubmit,
}) {
    const [errors, setErrors] = useState({});

    const handleDegreeChange = (i, val) => {
        const updated = [...degrees];
        updated[i] = val;
        setDegrees(updated);
    };

    const addDegree = () => setDegrees([...degrees, ""]);
    const removeDegree = (i) => {
        if (degrees.length === 1) return;
        setDegrees(degrees.filter((_, idx) => idx !== i));
    };

    const validate = () => {
        const errs = {};
        if (!data.regNumber.trim())
            errs.regNumber = "Registration number is required";
        if (!data.experience.trim()) errs.experience = "Experience is required";
        if (degrees.every((d) => !d.trim()))
            errs.degrees = "Add at least one degree";
        if (!acceptedTerms) errs.terms = "Please accept the Terms & Conditions";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    return (
        <div>
            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Professional Details</span>
                <div className="sg-section-line" />
            </div>

            <div className="sg-row sg-row-2">
                <Field
                    label="Registration Number"
                    required
                    error={errors.regNumber}
                >
                    <input
                        className={`sg-input${errors.regNumber ? " sg-input-err" : ""}`}
                        name="regNumber"
                        value={data.regNumber}
                        onChange={onChange}
                        placeholder="MCI/State reg. number"
                    />
                </Field>
                <Field label="Experience" required error={errors.experience}>
                    <input
                        className={`sg-input${errors.experience ? " sg-input-err" : ""}`}
                        name="experience"
                        value={data.experience}
                        onChange={onChange}
                        placeholder="e.g. 8 years"
                    />
                </Field>
            </div>

            <Field label="Degree(s)" required error={errors.degrees}>
                {degrees.map((degree, i) => (
                    <div key={i} className="sg-degree-row">
                        <input
                            className="sg-input"
                            value={degree}
                            onChange={(e) =>
                                handleDegreeChange(i, e.target.value)
                            }
                            placeholder="e.g. MBBS, MD"
                        />
                        <button
                            type="button"
                            className="sg-btn sg-btn-danger"
                            onClick={() => removeDegree(i)}
                            disabled={degrees.length === 1}
                        >
                            <X size={13} />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    className="sg-btn sg-btn-outline sg-btn-sm"
                    style={{ marginTop: 4 }}
                    onClick={addDegree}
                >
                    <Plus size={11} /> Add Degree
                </button>
            </Field>

            <div className="sg-terms">
                <input
                    type="checkbox"
                    id="terms"
                    className="sg-checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                />
                <label className="sg-terms-label" htmlFor="terms">
                    I agree to the{" "}
                    <Link to="/terms" target="_blank" className="sg-terms-link">
                        Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link
                        to="/privacy"
                        target="_blank"
                        className="sg-terms-link"
                    >
                        Privacy Policy
                    </Link>
                    .
                </label>
            </div>
            {errors.terms && (
                <div className="sg-errtip" style={{ marginTop: 4 }}>
                    {errors.terms}
                </div>
            )}

            <button
                type="button"
                className="sg-btn sg-btn-primary sg-btn-full"
                style={{ marginTop: 20 }}
                onClick={() => validate() && onSubmit()}
                disabled={!acceptedTerms}
            >
                <UserPlus size={15} /> Create Account
            </button>

            {/* Step 4 nav — no next button, spacer keeps hint centred */}
            <div className="sg-nav" style={{ paddingBottom: 0 }}>
                <button
                    type="button"
                    className="sg-btn sg-btn-outline"
                    onClick={onBack}
                >
                    <ChevronLeft size={14} /> Back
                </button>
                <span className="sg-nav-hint">Step 4 of 4</span>
                <div className="sg-nav-spacer" />
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────
   Main Signup Component
───────────────────────────────────────── */
const Signup = (props) => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const selectedPlan = params.get("plan");
    const selectedBilling = params.get("billing");

    const [step, setStep] = useState(1);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [availability, setAvailability] = useState([
        { days: [], slots: [{ startTime: "", endTime: "", slotDuration: 15 }] },
    ]);
    const [degrees, setDegrees] = useState([""]);
    const [credentials, setCredentials] = useState({
        name: "",
        email: "",
        emailVerified: false,
        password: "",
        cpassword: "",
        clinicName: "",
        phone: "",
        secondaryPhone: "",
        street: "",
        street2: "",
        street3: "",
        city: "",
        state: "",
        pincode: "",
        regNumber: "",
        experience: "",
    });

    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setCredentials((prev) => ({ ...prev, [name]: value }));
    };

    const allowedPlans = ["starter", "pro", "enterprise"];
    const planToSave = allowedPlans.includes(selectedPlan)
        ? selectedPlan.toUpperCase()
        : "FREE";

    const PLAN_COLORS = {
        starter: "#60a5fa",
        pro: "#a78bfa",
        enterprise: "#fb923c",
    };
    const planColor = PLAN_COLORS[selectedPlan] || "#60a5fa";

    const formatAvailability = () => {
        const dayMap = {};
        availability.forEach((block) => {
            block.days.forEach((day) => {
                if (!dayMap[day]) dayMap[day] = [];
                block.slots.forEach((slot) => {
                    dayMap[day].push({
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        slotDuration: slot.slotDuration,
                    });
                });
            });
        });
        Object.keys(dayMap).forEach((day) => {
            dayMap[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        return Object.keys(dayMap).map((day) => ({ day, slots: dayMap[day] }));
    };

    const handleSubmit = async () => {
        const bodyToSend = {
            name: credentials.name,
            email: credentials.email,
            password: credentials.password,
            clinicName: credentials.clinicName,
            phone: normalizePhone(credentials.phone),
            appointmentPhone: credentials.secondaryPhone
                ? normalizePhone(credentials.secondaryPhone)
                : "",
            address: {
                line1: credentials.street,
                line2: credentials.street2,
                line3: credentials.street3,
                city: credentials.city,
                state: credentials.state,
                pincode: credentials.pincode,
            },
            regNumber: credentials.regNumber,
            experience: credentials.experience,
            degree: degrees.filter((d) => d.trim() !== ""),
            role: "doctor",
            subscription: {
                plan: planToSave,
                billing: selectedBilling === "yearly" ? "yearly" : "monthly",
                status: "trial",
            },
        };

        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/create_doctor`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(bodyToSend),
                },
            );
            const json = await response.json();

            if (json.success) {
                const token = json.authtoken;
                localStorage.setItem("token", token);

                const formattedAvailability = formatAvailability();
                const availabilityRes = await authFetch(
                    `${API_BASE_URL}/api/doctor/timing/set_availability`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "auth-token": token,
                        },
                        body: JSON.stringify({
                            availability: formattedAvailability,
                        }),
                    },
                );
                const availabilityJson = await availabilityRes.json();

                if (!availabilityJson.success) {
                    props.showAlert(
                        "Account created, but failed to save timings",
                        "warning",
                    );
                } else {
                    props.showAlert("Account created successfully!", "success");
                }

                setTimeout(() => navigate("/login"), 1500);
            } else {
                props.showAlert(json.error || "Invalid input", "danger");
            }
        } catch (err) {
            props.showAlert("Network error. Please try again.", "danger");
        }
    };

    return (
        <div className="sg-root">
            <div className="sg-card">
                <div className="sg-header">
                    <div className="sg-logo">⚕</div>
                    <h1 className="sg-title">
                        Create your <em>account</em>
                    </h1>
                    <div className="sg-subtitle">
                        Set up your clinic profile to get started
                    </div>
                    {selectedPlan && (
                        <div
                            className="sg-plan-badge"
                            style={{
                                background: `${planColor}12`,
                                borderColor: `${planColor}30`,
                                color: planColor,
                            }}
                        >
                            <Check size={12} />
                            {selectedPlan.toUpperCase()} plan ·{" "}
                            {selectedBilling}
                        </div>
                    )}
                    <StepBar current={step} />
                </div>

                <div className="sg-body">
                    {step === 1 && (
                        <Step1
                            data={credentials}
                            onChange={onChange}
                            onNext={() => setStep(2)}
                        />
                    )}
                    {step === 2 && (
                        <Step2
                            data={credentials}
                            onChange={onChange}
                            onNext={() => setStep(3)}
                            onBack={() => setStep(1)}
                        />
                    )}
                    {step === 3 && (
                        <Step3
                            availability={availability}
                            setAvailability={setAvailability}
                            onNext={() => setStep(4)}
                            onBack={() => setStep(2)}
                        />
                    )}
                    {step === 4 && (
                        <Step4
                            data={credentials}
                            onChange={onChange}
                            degrees={degrees}
                            setDegrees={setDegrees}
                            acceptedTerms={acceptedTerms}
                            setAcceptedTerms={setAcceptedTerms}
                            onBack={() => setStep(3)}
                            onSubmit={handleSubmit}
                        />
                    )}

                    {step === 1 && (
                        <div className="sg-footer">
                            Already have an account?{" "}
                            <Link to="/login">Sign in</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Signup;
