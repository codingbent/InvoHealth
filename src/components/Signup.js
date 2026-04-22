import { useState, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { authFetch } from "./authfetch";
import {
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
    Globe,
    ChevronDown,
} from "lucide-react";
import "react-phone-input-2/lib/style.css";
import "../css/Signup.css";
import { API_BASE_URL } from "../components/config";
import CountrySelect from "../hooks/CountrySelect";
import { fetchCountries } from "../api/country.api";
import "../css/Signup.css"

const normalizePhone = (phone) => phone.replace(/\D/g, "");

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const STEPS = ["Account", "Center", "Schedule", "Professional", "Payments"];
const passwordRules = {
    length: /.{8,}/,
    upper: /[A-Z]/,
    lower: /[a-z]/,
    number: /[0-9]/,
    special: /[^A-Za-z0-9]/,
};

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
function Step1({ data, onChange, onNext, showAlert }) {
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
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [cooldown]);

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
        if (cooldown > 0) return;

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

            //START COOLDOWN (60 sec)
            setCooldown(60);

            showAlert("OTP sent to " + data.email, "success");
        } catch (err) {
            setOtpError("Failed to send OTP. Try again.");
        } finally {
            setSendingOtp(false);
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
                    <div className="sg-input-prefix-wrap">
                        <span className="sg-prefix">Dr</span>

                        <input
                            className={`sg-input sg-input-with-prefix${errors.name ? " sg-input-err" : ""}`}
                            name="name"
                            value={data.name}
                            onChange={onChange}
                            placeholder="John Doe"
                        />
                    </div>
                </Field>
                <Field label="Email Address" required error={errors.email}>
                    <div className="sg-input-wrap">
                        <input
                            className={`sg-input${emailVerified ? " sg-input-ok" : errors.email ? " sg-input-err" : ""}`}
                            name="email"
                            type="email"
                            value={data.email}
                            onChange={onChange}
                            placeholder="email@domain.com"
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
                            disabled={sendingOtp || cooldown > 0}
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
                                    disabled={cooldown > 0 || sendingOtp}
                                >
                                    {cooldown > 0
                                        ? `Resend in ${cooldown}s`
                                        : sendingOtp
                                          ? "Sending..."
                                          : "Resend"}
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
                <span className="sg-nav-hint">Step 1 of 5</span>
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
   Step 2 — medical center Info + Address
───────────────────────────────────────── */
function Step2({
    data,
    onChange,
    onNext,
    onBack,
    countries,
    countryCode,
    setCountryCode,
}) {
    const [errors, setErrors] = useState({});
    const validate = () => {
        const errs = {};

        if (!data.clinicName)
            errs.clinicName = "Medical Center name is required";

        if (!data.line1) errs.line1 = "Address Line 1 is required";

        if (!data.city) errs.city = "City is required";

        if (!data.state) errs.state = "State is required";

        if (!data.country) errs.country = "Country is required";

        if (!data.pincode) errs.pincode = "Pincode is required";

        if (!data.phone) errs.phone = "Doctor Contact is required";

        if (!data.secondaryPhone)
            errs.secondaryPhone = "Appointment Contact is required";

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    return (
        <div>
            {/* ── Clinic Info ── */}
            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">
                    Medical Center Information
                </span>
                <div className="sg-section-line" />
            </div>

            <Field
                label="Medical Center Name"
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

            {/* ── Contact Numbers ── */}
            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Contact Numbers</span>
                <div className="sg-section-line" />
            </div>

            <div className="sg-row sg-row-2">
                {/* DOCTOR CONTACT */}
                <Field label="Doctor Contact" required error={errors.phone}>
                    <div style={{ display: "flex", gap: 8 }}>
                        <select
                            className="sg-input"
                            style={{ maxWidth: "fit-content" }}
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                        >
                            {countries.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.dialCode}
                                </option>
                            ))}
                        </select>

                        <input
                            className="sg-input"
                            value={data.phone}
                            onChange={(e) =>
                                onChange({
                                    target: {
                                        name: "phone",
                                        value: e.target.value.replace(
                                            /\D/g,
                                            "",
                                        ),
                                    },
                                })
                            }
                            placeholder="Enter phone number"
                        />
                    </div>
                </Field>

                {/* APPOINTMENT CONTACT */}
                <Field
                    label="Appointment Contact"
                    required
                    error={errors.secondaryPhone}
                >
                    <div style={{ display: "flex", gap: 8 }}>
                        <select
                            className="sg-input"
                            style={{ maxWidth: "fit-content" }}
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                        >
                            {countries.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.dialCode}
                                </option>
                            ))}
                        </select>

                        <input
                            className="sg-input"
                            value={data.secondaryPhone}
                            onChange={(e) =>
                                onChange({
                                    target: {
                                        name: "secondaryPhone",
                                        value: e.target.value.replace(
                                            /\D/g,
                                            "",
                                        ),
                                    },
                                })
                            }
                            placeholder="Enter appointment number"
                        />
                    </div>
                </Field>
            </div>

            {/* ── Clinic Address ── */}
            <div className="sg-section">
                <div className="sg-section-line" />
                <span className="sg-section-title">Medical Center Address</span>
                <div className="sg-section-line" />
            </div>

            <Field label="Address Line 1" required error={errors.line1}>
                <input
                    className={`sg-input${errors.line ? " sg-input-err" : ""}`}
                    name="line1"
                    value={data.line1}
                    onChange={onChange}
                    placeholder="Building Number"
                />
            </Field>

            <div className="sg-row sg-row-2">
                <Field label="Address Line 2">
                    <input
                        className="sg-input"
                        name="line2"
                        value={data.line2}
                        onChange={onChange}
                        placeholder="Street Name (optional)"
                    />
                </Field>
                <Field label="Address Line 3">
                    <input
                        className="sg-input"
                        name="line3"
                        value={data.line3}
                        onChange={onChange}
                        placeholder="Area / Locality (optional)"
                    />
                </Field>
            </div>

            <div className="sg-row sg-row-2">
                <Field label="City" required error={errors.city}>
                    <input
                        className={`sg-input${errors.city ? " sg-input-err" : ""}`}
                        name="city"
                        value={data.city}
                        onChange={onChange}
                        placeholder="Enter City Name"
                    />
                </Field>
                <Field label="State" required error={errors.state}>
                    <input
                        className={`sg-input${errors.state ? " sg-input-err" : ""}`}
                        name="state"
                        value={data.state}
                        onChange={onChange}
                        placeholder="Enter State Name"
                    />
                </Field>
            </div>

            <div className="sg-row sg-row-2">
                <Field label="Pincode" required error={errors.pincode}>
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
                        placeholder="6-digit pincode"
                        maxLength={6}
                    />
                </Field>
                <Field label="Country" required>
                    <div className="sg-country-wrap">
                        <Globe size={13} className="sg-country-globe" />
                        <CountrySelect
                            countries={countries}
                            value={data.country}
                            onChange={(val) =>
                                onChange({
                                    target: { name: "country", value: val },
                                })
                            }
                        />{" "}
                        <ChevronDown size={12} className="sg-country-chevron" />
                    </div>
                </Field>
            </div>

            <div className="sg-nav">
                <button
                    type="button"
                    className="sg-btn sg-btn-outline"
                    onClick={onBack}
                >
                    <ChevronLeft size={14} /> Back
                </button>
                <span className="sg-nav-hint">Step 2 of 5</span>
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
function Step3({ availability, setAvailability, onNext, onBack, showAlert }) {
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
            showAlert("Add at least one working day", "danger");
            return false;
        }
        for (const [bi, block] of availability.entries()) {
            if (block.days.length === 0) continue;
            for (const slot of block.slots) {
                if (!slot.startTime || !slot.endTime) {
                    showAlert(
                        `Fill all time slots in group ${bi + 1}`,
                        "danger",
                    );
                    return false;
                }
                if (slot.startTime >= slot.endTime) {
                    showAlert(
                        `Start must be before end in group ${bi + 1}`,
                        "danger",
                    );
                    return false;
                }
            }
            if (isOverlapping(block.slots)) {
                showAlert(
                    `Overlapping time slots in group ${bi + 1}`,
                    "danger",
                );
                return false;
            }
        }
        return true;
    };

    return (
        <div>
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
                            <span className="sg-required"> *</span>
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
                <span className="sg-nav-hint">Step 3 of 5</span>
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
    onBack,
    onNext,
    showAlert,
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

        if (!data.regNumber.trim()) {
            errs.regNumber = "Registration number is required";
        }

        if (!data.experience.trim()) {
            errs.experience = "Experience is required";
        }

        if (!degrees.length) {
            errs.degrees = "Add at least one degree";
        } else if (degrees.some((d) => !d.trim())) {
            errs.degrees = "Degree cannot be empty";
        }

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
                        placeholder="Your country's medical license number"
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

            {errors.terms && (
                <div className="sg-errtip" style={{ marginTop: 4 }}>
                    {errors.terms}
                </div>
            )}

            {/* Step 4 nav — no next button, spacer keeps hint centred */}
            <div className="sg-nav" style={{ paddingBottom: 0 }}>
                <button
                    type="button"
                    className="sg-btn sg-btn-outline"
                    onClick={onBack}
                >
                    <ChevronLeft size={14} /> Back
                </button>
                <span className="sg-nav-hint">Step 4 of 5</span>
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

function Step5({
    paymentMethods,
    setPaymentMethods,
    onBack,
    onSubmit,
    acceptedTerms,
    setAcceptedTerms,
    showAlert,
}) {
    const [categories, setCategories] = useState([]);
    const [errors, setErrors] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const res = await fetch(`${API_BASE_URL}/api/doctor/all`);
            const data = await res.json();

            if (data.success) {
                setCategories(data.data || []);
            }
        };
        fetchData();
    }, []);

    const addMethod = () => {
        setPaymentMethods([
            ...paymentMethods,
            {
                categoryId: "",
                subCategoryId: "",
                label: "",
            },
        ]);
    };

    const updateMethod = (index, field, value) => {
        const updated = [...paymentMethods];

        // RESET subcategory when category changes
        if (field === "categoryId") {
            updated[index].subCategoryId = "";
        }

        updated[index][field] = value;
        setPaymentMethods(updated);
    };

    const removeMethod = (index) => {
        setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
    };

    const validate = () => {
        const errs = [];

        if (paymentMethods.length === 0) {
            showAlert("Add at least one payment method", "danger");
            return false;
        }

        if (!acceptedTerms) {
            showAlert("Accept Terms & Conditions", "danger");
            return false;
        }

        paymentMethods.forEach((m, i) => {
            const err = {};

            if (!m.categoryId) err.categoryId = "Required";
            if (!m.subCategoryId) err.subCategoryId = "Required";
            if (!m.label) err.label = "Required";

            errs[i] = err;
        });

        setErrors(errs);

        return errs.every((e) => Object.keys(e).length === 0);
    };

    return (
        <div>
            <div className="sg-section">
                <span className="sg-section-title">
                    Payment Methods <span className="sg-required">*</span>
                </span>
            </div>

            {paymentMethods.map((m, i) => {
                const selectedCategory = categories.find(
                    (c) => String(c._id) === String(m.categoryId),
                );

                return (
                    <div key={i} className="sg-avail-block">
                        {/* CATEGORY */}
                        <select
                            className={`sg-input mt-2 ${
                                errors[i]?.categoryId ? "sg-input-err" : ""
                            }`}
                            value={m.categoryId}
                            onChange={(e) =>
                                updateMethod(i, "categoryId", e.target.value)
                            }
                        >
                            <option value="">Select Category *</option>
                            {categories.map((c) => (
                                <option key={c._id} value={c._id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>

                        {errors[i]?.categoryId && (
                            <div className="sg-errtip">
                                {errors[i].categoryId}
                            </div>
                        )}

                        {/* SUBCATEGORY */}
                        <select
                            className={`sg-input mt-2 ${
                                errors[i]?.subCategoryId ? "sg-input-err" : ""
                            }`}
                            value={m.subCategoryId}
                            onChange={(e) =>
                                updateMethod(i, "subCategoryId", e.target.value)
                            }
                            disabled={!m.categoryId}
                        >
                            <option value="">Select Subcategory *</option>

                            {selectedCategory?.subcategories?.map((s) => (
                                <option key={s._id} value={s._id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>

                        {errors[i]?.subCategoryId && (
                            <div className="sg-errtip">
                                {errors[i].subCategoryId}
                            </div>
                        )}

                        {/* labels */}
                        <input
                            className={`sg-input mt-2 ${
                                errors[i]?.label ? "sg-input-err" : ""
                            }`}
                            placeholder={`Enter ${selectedCategory?.name || "payment"} label`}
                            value={m.label}
                            onChange={(e) =>
                                updateMethod(i, "label", e.target.value)
                            }
                        />

                        {errors[i]?.label && (
                            <div className="sg-errtip">{errors[i].label}</div>
                        )}

                        {/* REMOVE */}
                        <button
                            className="sg-btn sg-btn-danger mt-2"
                            onClick={() => removeMethod(i)}
                        >
                            Remove
                        </button>
                    </div>
                );
            })}

            <button className="sg-btn sg-btn-outline" onClick={addMethod}>
                + Add Payment Method
            </button>

            {/* TERMS */}
            <div className="sg-terms">
                <label className="sg-checkbox-wrap">
                    <input
                        type="checkbox"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                    />

                    <span className="sg-custom-checkbox">
                        <svg viewBox="0 0 24 24">
                            <path d="M20 6L9 17L4 12" />
                        </svg>
                    </span>

                    <span className="sg-terms-label">
                        I agree to the{" "}
                        <Link to="/terms" target="_blank">
                            Terms & Conditions
                        </Link>{" "}
                        and{" "}
                        <Link to="/privacy" target="_blank">
                            Privacy Policy
                        </Link>
                    </span>
                </label>
            </div>

            <div className="sg-nav">
                <button
                    type="button"
                    className="sg-btn sg-btn-outline"
                    onClick={onBack}
                >
                    <ChevronLeft size={14} /> Back
                </button>

                <span className="sg-nav-hint">Step 5 of 5</span>

                <button
                    className="sg-btn sg-btn-primary"
                    onClick={() => validate() && onSubmit()}
                >
                    Create Account
                </button>
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
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [countryCode, setCountryCode] = useState("+91");
    const [credentials, setCredentials] = useState({
        name: "",
        email: "",
        emailVerified: false,
        password: "",
        cpassword: "",
        clinicName: "",
        phone: "",
        secondaryPhone: "",
        line: "",
        line2: "",
        line3: "",
        city: "",
        state: "",
        country: "IN",
        pincode: "",
        regNumber: "",
        experience: "",
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const data = await fetchCountries();
                setCountries(data);
            } catch (err) {
                console.error("Country load failed", err);
            }
        };

        loadCountries();
    }, []);

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

    const [countries, setCountries] = useState([]);
    const selectedCountry = countries.find(
        (c) => c.code === credentials.country,
    );
    const handleSubmit = async () => {
        if (!selectedCountry) {
            props.showAlert("Country not loaded", "danger");
            return;
        }
        const bodyToSend = {
            name: credentials.name,
            email: credentials.email,
            password: credentials.password,
            clinicName: credentials.clinicName,
            phone: countryCode + normalizePhone(credentials.phone),
            appointmentPhone:
                countryCode + normalizePhone(credentials.secondaryPhone),

            address: {
                line1: credentials.line1,
                line2: credentials.line2,
                line3: credentials.line3,
                city: credentials.city,
                state: credentials.state,
                countryId: selectedCountry._id,
                countryCode: selectedCountry.code,
                pincode: credentials.pincode,
            },

            regNumber: credentials.regNumber,
            experience: credentials.experience,
            degree: degrees.filter((d) => d.trim() !== ""),
            role: "doctor",

            paymentMethods: paymentMethods.map((m) => ({
                categoryId: m.categoryId,
                subCategoryId: m.subCategoryId,
                label: m.label,
                isActive: true,
            })),

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
                        Set up your medical center profile to get started
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
                            showAlert={props.showAlert}
                        />
                    )}
                    {step === 2 && (
                        <Step2
                            data={credentials}
                            onChange={onChange}
                            onNext={() => setStep(3)}
                            onBack={() => setStep(1)}
                            countries={countries}
                            countryCode={countryCode}
                            setCountryCode={setCountryCode}
                        />
                    )}
                    {step === 3 && (
                        <Step3
                            availability={availability}
                            setAvailability={setAvailability}
                            onNext={() => setStep(4)}
                            onBack={() => setStep(2)}
                            showAlert={props.showAlert}
                        />
                    )}
                    {step === 4 && (
                        <Step4
                            data={credentials}
                            onChange={onChange}
                            degrees={degrees}
                            setDegrees={setDegrees}
                            onBack={() => setStep(3)}
                            onNext={() => setStep(5)}
                            showAlert={props.showAlert}
                        />
                    )}
                    {step === 5 && (
                        <Step5
                            paymentMethods={paymentMethods}
                            setPaymentMethods={setPaymentMethods}
                            acceptedTerms={acceptedTerms}
                            setAcceptedTerms={setAcceptedTerms}
                            onBack={() => setStep(4)}
                            onSubmit={handleSubmit}
                            showAlert={props.showAlert}
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
