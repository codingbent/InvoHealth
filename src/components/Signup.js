import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { authFetch } from "./authfetch";
import {
    ShieldCheck,
    UserPlus,
    Check,
    X,
    Plus,
    Trash2,
    Clock,
    Calendar,
    EyeOff,
    Eye,
} from "lucide-react";

const normalizePhone = (phone) => phone.replace(/\D/g, "").slice(-10);
const isValidIndianMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

const Signup = (props) => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const selectedPlan = params.get("plan");
    const selectedBilling = params.get("billing");
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const [showPassword, setShowPassword] = useState(false);

    const [availability, setAvailability] = useState([
        { days: [], slots: [{ startTime: "", endTime: "", slotDuration: 15 }] },
    ]);
    const [credentials, setcredentials] = useState({
        name: "",
        email: "",
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
        degrees: [""],
    });
    const [otp, setOtp] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const passwordRules = {
        length: /.{8,}/,
        upper: /[A-Z]/,
        lower: /[a-z]/,
        number: /[0-9]/,
        special: /[^A-Za-z0-9]/,
    };
    const [passwordChecks, setPasswordChecks] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
    });

    const normalizedPhone = useMemo(
        () => normalizePhone(credentials.phone),
        [credentials.phone],
    );
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        setSessionId("");
        setOtp("");
        setPhoneVerified(false);
        setOtpCooldown(0);
    }, [normalizedPhone]);

    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );
    const allowedPlans = ["starter", "pro", "enterprise"];
    const planToSave = allowedPlans.includes(selectedPlan)
        ? selectedPlan.toUpperCase()
        : "FREE";

    const updateSlotTime = (blockIndex, slotIndex, field, value) => {
        const updated = [...availability];
        updated[blockIndex].slots[slotIndex][field] = value;
        setAvailability(updated);
    };
    const addTimeSlot = (blockIndex) => {
        const updated = [...availability];
        updated[blockIndex].slots.push({
            startTime: "",
            endTime: "",
            slotDuration: 15,
        });
        setAvailability(updated);
    };
    const removeTimeSlot = (blockIndex, slotIndex) => {
        const updated = [...availability];
        if (updated[blockIndex].slots.length === 1) return;
        updated[blockIndex].slots.splice(slotIndex, 1);
        setAvailability(updated);
    };
    const toggleDay = (index, day) => {
        const updated = [...availability];
        if (updated[index].days.includes(day)) {
            updated[index].days = updated[index].days.filter((d) => d !== day);
        } else {
            updated[index].days.push(day);
        }
        setAvailability(updated);
    };
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
    function isOverlapping(slots) {
        for (let i = 0; i < slots.length; i++) {
            for (let j = i + 1; j < slots.length; j++) {
                if (
                    slots[i].startTime < slots[j].endTime &&
                    slots[j].startTime < slots[i].endTime
                )
                    return true;
            }
        }
        return false;
    }
    function isDayOverlapping(availability) {
        const dayMap = {};
        for (const block of availability) {
            for (const day of block.days) {
                if (!dayMap[day]) dayMap[day] = [];
                for (const slot of block.slots) {
                    dayMap[day].push({
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                    });
                }
            }
        }
        for (const day in dayMap) {
            const slots = dayMap[day];
            for (let i = 0; i < slots.length; i++) {
                for (let j = i + 1; j < slots.length; j++) {
                    if (
                        slots[i].startTime < slots[j].endTime &&
                        slots[j].startTime < slots[i].endTime
                    )
                        return day;
                }
            }
        }
        return null;
    }
    const addTimingBlock = () => {
        setAvailability([
            ...availability,
            {
                days: [],
                slots: [{ startTime: "", endTime: "", slotDuration: 15 }],
            },
        ]);
    };
    const removeTimingBlock = (index) => {
        if (availability.length === 1) return;
        const updated = [...availability];
        updated.splice(index, 1);
        setAvailability(updated);
    };
    const handleDegreeChange = (index, value) => {
        const updated = [...credentials.degrees];
        updated[index] = value;
        setcredentials({ ...credentials, degrees: updated });
    };
    const addDegreeField = () => {
        setcredentials({
            ...credentials,
            degrees: [...credentials.degrees, ""],
        });
    };
    const removeDegreeField = (index) => {
        const updated = [...credentials.degrees];
        updated.splice(index, 1);
        setcredentials({ ...credentials, degrees: updated });
    };

    const onChange = (e) => {
        setcredentials({ ...credentials, [e.target.name]: e.target.value });
        if (e.target.name === "password") {
            const value = e.target.value;
            setPasswordChecks({
                length: passwordRules.length.test(value),
                upper: passwordRules.upper.test(value),
                lower: passwordRules.lower.test(value),
                number: passwordRules.number.test(value),
                special: passwordRules.special.test(value),
            });
        }
    };

    useEffect(() => {
        if (otpCooldown <= 0) return;
        const timer = setTimeout(
            () => setOtpCooldown((prev) => prev - 1),
            1000,
        );
        return () => clearTimeout(timer);
    }, [otpCooldown]);

    const sendOTP = async () => {
        if (otpCooldown > 0) return;
        const phone = normalizePhone(credentials.phone);
        if (!isValidIndianMobile(phone)) {
            props.showAlert("Enter a valid Indian mobile number", "danger");
            return;
        }
        try {
            setSendingOtp(true);
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/authentication/check-phone`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone }),
                },
            );
            const checkData = await checkRes.json();
            if (!checkData.success) {
                setSendingOtp(false);
                alert(checkData.error);
                return;
            }
            const res = await authFetch(
                `${API_BASE_URL}/api/authentication/send-otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone }),
                },
            );
            const data = await res.json();
            setSendingOtp(false);
            if (data.success) {
                setSessionId(data.sessionId);
                setOtpCooldown(60);
                props.showAlert("OTP sent successfully", "success");
            } else
                props.showAlert(data.error || "Unable to send OTP", "danger");
        } catch (err) {
            setSendingOtp(false);
            props.showAlert("Network error. Try again.", "danger");
        }
    };

    const verifyNumber = async () => {
        if (otp.length !== 6) {
            props.showAlert("Enter valid 6-digit OTP", "danger");
            return;
        }
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/authentication/verify-otp`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        phone: normalizePhone(credentials.phone),
                        otp,
                        sessionId,
                    }),
                },
            );
            if (!res) {
                props.showAlert("Network error. Try again.", "danger");
                return;
            }
            const data = await res.json();
            if (data.success) {
                setPhoneVerified(true);
                props.showAlert("Phone number verified", "success");
            } else props.showAlert(data.error || "Invalid OTP", "danger");
        } catch (err) {
            props.showAlert("OTP verification failed", "danger");
        }
    };

    const handlesubmit = async (e) => {
        e.preventDefault();
        if (
            !passwordChecks.length ||
            !passwordChecks.upper ||
            !passwordChecks.lower ||
            !passwordChecks.number ||
            !passwordChecks.special
        ) {
            props.showAlert(
                "Password does not meet security requirements",
                "danger",
            );
            return;
        }
        if (!phoneVerified) {
            props.showAlert("Please verify phone number first", "danger");
            return;
        }
        if (!acceptedTerms) {
            props.showAlert("Please accept Terms & Conditions", "danger");
            return;
        }
        if (credentials.password !== credentials.cpassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }
        const conflictDay = isDayOverlapping(availability);
        if (conflictDay) {
            props.showAlert(`Overlapping slots on ${conflictDay}`, "danger");
            return;
        }
        if (
            !availability.length ||
            availability.every((b) => b.days.length === 0)
        ) {
            props.showAlert("Please add at least one working day", "danger");
            return;
        }
        for (const block of availability) {
            if (block.days.length === 0) {
                props.showAlert(
                    `Please select days for Slot ${availability.indexOf(block) + 1}`,
                    "danger",
                );
                return;
            }
            if (isOverlapping(block.slots)) {
                props.showAlert("Time slots are overlapping", "danger");
                return;
            }
            for (const slot of block.slots) {
                if (!slot.startTime || !slot.endTime) {
                    props.showAlert("Fill all time slots", "danger");
                    return;
                }
                if (slot.startTime >= slot.endTime) {
                    props.showAlert("Invalid time range", "danger");
                    return;
                }
            }
        }
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
            degree: credentials.degrees.filter((d) => d.trim() !== ""),
            role: "doctor",
            subscription: {
                plan: planToSave,
                billing: selectedBilling === "yearly" ? "yearly" : "monthly",
                status: "trial",
            },
        };
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
            // localStorage.setItem("token", token);
            // localStorage.setItem("name", credentials.name);
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
                props.showAlert("Account created successfully", "success");
            }
            setTimeout(() => {
                navigate("/login");
            }, 1500);
        } else props.showAlert(json.error || "Invalid input", "danger");
    };

    const PLAN_COLORS = {
        starter: "#60a5fa",
        pro: "#a78bfa",
        enterprise: "#fb923c",
    };
    const planColor = PLAN_COLORS[selectedPlan] || "#60a5fa";

    return (
        <>
            <div className="sg-root">
                <div className="sg-card">
                    {/* Header */}
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
                    </div>

                    <div className="sg-body">
                        <form onSubmit={handlesubmit}>
                            {/* ── Account Info ── */}
                            <div className="sg-section">
                                <div className="sg-section-line" />
                                <span className="sg-section-title">
                                    Account Information
                                </span>
                                <div className="sg-section-line" />
                            </div>

                            <div className="sg-row sg-row-2">
                                <div className="sg-field">
                                    <label className="sg-label">
                                        Full Name{" "}
                                        <span className="sg-required">*</span>
                                    </label>
                                    <input
                                        className="sg-input"
                                        type="text"
                                        name="name"
                                        required
                                        onChange={onChange}
                                        placeholder="Dr. John Doe"
                                    />
                                </div>
                                <div className="sg-field">
                                    <label className="sg-label">
                                        Email Address{" "}
                                        <span className="sg-required">*</span>
                                    </label>
                                    <input
                                        className="sg-input"
                                        type="email"
                                        name="email"
                                        required
                                        onChange={onChange}
                                        placeholder="email@clinic.com"
                                    />
                                </div>
                            </div>

                            <div className="sg-row sg-row-2">
                                <div className="sg-field">
                                    <label className="sg-label">
                                        Password{" "}
                                        <span className="sg-required">*</span>
                                    </label>
                                    <input
                                        className="sg-input"
                                        type="password"
                                        name="password"
                                        required
                                        onChange={onChange}
                                        placeholder="Create a strong password"
                                    />
                                    <button
                                        type="button"
                                        className="lg-eye-btn"
                                        onClick={() =>
                                            setShowPassword((p) => !p)
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={16} />
                                        ) : (
                                            <Eye size={16} />
                                        )}
                                    </button>
                                    <div className="sg-pw-checks">
                                        {[
                                            {
                                                key: "length",
                                                label: "Minimum 8 characters",
                                            },
                                            {
                                                key: "upper",
                                                label: "One uppercase letter",
                                            },
                                            {
                                                key: "lower",
                                                label: "One lowercase letter",
                                            },
                                            {
                                                key: "number",
                                                label: "One number",
                                            },
                                            {
                                                key: "special",
                                                label: "One special character",
                                            },
                                        ].map((r) => (
                                            <div
                                                key={r.key}
                                                className={`sg-pw-check ${passwordChecks[r.key] ? "pass" : "fail"}`}
                                            >
                                                <span className="sg-pw-icon">
                                                    {passwordChecks[r.key] ? (
                                                        <Check size={9} />
                                                    ) : (
                                                        <X size={9} />
                                                    )}
                                                </span>
                                                {r.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="sg-field">
                                    <label className="sg-label">
                                        Confirm Password{" "}
                                        <span className="sg-required">*</span>
                                    </label>
                                    <input
                                        className="sg-input"
                                        type="password"
                                        name="cpassword"
                                        required
                                        onChange={onChange}
                                        placeholder="Repeat password"
                                    />
                                    <button
                                        type="button"
                                        className="lg-eye-btn"
                                        onClick={() =>
                                            setShowPassword((p) => !p)
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={16} />
                                        ) : (
                                            <Eye size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* ── Clinic Info ── */}
                            <div className="sg-section">
                                <div className="sg-section-line" />
                                <span className="sg-section-title">
                                    Clinic Information
                                </span>
                                <div className="sg-section-line" />
                            </div>

                            <div
                                className="sg-field"
                                style={{ marginBottom: 14 }}
                            >
                                <label className="sg-label">
                                    Clinic / Hospital Name{" "}
                                    <span className="sg-required">*</span>
                                </label>
                                <input
                                    className="sg-input"
                                    type="text"
                                    name="clinicName"
                                    required
                                    onChange={onChange}
                                    placeholder="City Medical Centre"
                                />
                            </div>

                            {/* ── Contact Verification ── */}
                            <div className="sg-section">
                                <div className="sg-section-line" />
                                <span className="sg-section-title">
                                    Contact Verification
                                </span>
                                <div className="sg-section-line" />
                            </div>

                            <div
                                className="sg-field"
                                style={{ marginBottom: 14 }}
                            >
                                <label className="sg-label">
                                    Doctor Contact{" "}
                                    <span className="sg-required">*</span>
                                </label>
                                <input
                                    className="sg-input"
                                    type="text"
                                    name="phone"
                                    value={credentials.phone}
                                    onChange={onChange}
                                    disabled={phoneVerified}
                                    placeholder="10-digit mobile number"
                                />
                                {phoneVerified && (
                                    <div className="sg-phone-locked">
                                        🔒 Number locked after verification
                                    </div>
                                )}

                                {!phoneVerified && (
                                    <>
                                        {!sessionId ? (
                                            <button
                                                type="button"
                                                className="sg-btn sg-btn-outline sg-otp-btn"
                                                onClick={sendOTP}
                                                disabled={
                                                    sendingOtp ||
                                                    otpCooldown > 0
                                                }
                                            >
                                                {sendingOtp
                                                    ? "Sending OTP..."
                                                    : otpCooldown > 0
                                                      ? `Resend in ${otpCooldown}s`
                                                      : "Send OTP"}
                                            </button>
                                        ) : (
                                            <>
                                                <div className="sg-otp-wrap">
                                                    {otp
                                                        .split("")
                                                        .concat(
                                                            Array(6).fill(""),
                                                        )
                                                        .slice(0, 6)
                                                        .map((digit, i) => (
                                                            <input
                                                                key={i}
                                                                type="text"
                                                                maxLength={1}
                                                                className="sg-otp-box"
                                                                value={
                                                                    digit || ""
                                                                }
                                                                onChange={(
                                                                    e,
                                                                ) => {
                                                                    const val =
                                                                        e.target.value.replace(
                                                                            /\D/g,
                                                                            "",
                                                                        );
                                                                    if (!val)
                                                                        return;
                                                                    const newOtp =
                                                                        otp.split(
                                                                            "",
                                                                        );
                                                                    newOtp[i] =
                                                                        val;
                                                                    setOtp(
                                                                        newOtp
                                                                            .join(
                                                                                "",
                                                                            )
                                                                            .slice(
                                                                                0,
                                                                                6,
                                                                            ),
                                                                    );
                                                                    const next =
                                                                        e.target
                                                                            .nextSibling;
                                                                    if (next)
                                                                        next.focus();
                                                                }}
                                                                onKeyDown={(
                                                                    e,
                                                                ) => {
                                                                    if (
                                                                        e.key ===
                                                                        "Backspace"
                                                                    ) {
                                                                        const newOtp =
                                                                            otp.split(
                                                                                "",
                                                                            );
                                                                        newOtp[
                                                                            i
                                                                        ] = "";
                                                                        setOtp(
                                                                            newOtp.join(
                                                                                "",
                                                                            ),
                                                                        );
                                                                        const prev =
                                                                            e
                                                                                .target
                                                                                .previousSibling;
                                                                        if (
                                                                            prev
                                                                        )
                                                                            prev.focus();
                                                                    }
                                                                }}
                                                            />
                                                        ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="sg-btn sg-btn-primary"
                                                    style={{
                                                        marginTop: 12,
                                                        width: "100%",
                                                    }}
                                                    onClick={verifyNumber}
                                                    disabled={otp.length !== 6}
                                                >
                                                    <ShieldCheck size={14} />{" "}
                                                    Verify OTP
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}

                                {phoneVerified && (
                                    <div className="sg-verified-badge">
                                        <Check size={13} /> Phone number
                                        verified
                                    </div>
                                )}
                            </div>

                            <div
                                className="sg-field"
                                style={{ marginBottom: 14 }}
                            >
                                <label className="sg-label">
                                    Appointment Contact{" "}
                                    <span className="sg-required">*</span>
                                </label>
                                <input
                                    className="sg-input"
                                    type="text"
                                    name="secondaryPhone"
                                    onChange={onChange}
                                    placeholder="Public booking number"
                                />
                            </div>

                            {/* ── Address ── */}
                            <div className="sg-section">
                                <div className="sg-section-line" />
                                <span className="sg-section-title">
                                    Clinic Address
                                </span>
                                <div className="sg-section-line" />
                            </div>

                            <div
                                className="sg-field"
                                style={{ marginBottom: 10 }}
                            >
                                <input
                                    className="sg-input"
                                    placeholder="Address Line 1 *"
                                    name="street"
                                    required
                                    onChange={onChange}
                                />
                            </div>
                            <div
                                className="sg-field"
                                style={{ marginBottom: 10 }}
                            >
                                <input
                                    className="sg-input"
                                    placeholder="Address Line 2"
                                    name="street2"
                                    onChange={onChange}
                                />
                            </div>
                            <div
                                className="sg-field"
                                style={{ marginBottom: 10 }}
                            >
                                <input
                                    className="sg-input"
                                    placeholder="Address Line 3"
                                    name="street3"
                                    onChange={onChange}
                                />
                            </div>
                            <div
                                className="sg-row sg-row-2"
                                style={{ marginBottom: 10 }}
                            >
                                <input
                                    className="sg-input"
                                    placeholder="City *"
                                    name="city"
                                    required
                                    onChange={onChange}
                                />
                                <input
                                    className="sg-input"
                                    placeholder="State *"
                                    name="state"
                                    required
                                    onChange={onChange}
                                />
                            </div>
                            <div
                                className="sg-field"
                                style={{ marginBottom: 4 }}
                            >
                                <input
                                    className="sg-input"
                                    placeholder="Pincode *"
                                    name="pincode"
                                    required
                                    onChange={onChange}
                                />
                            </div>

                            {/* ── Availability ── */}
                            <div className="sg-section">
                                <div className="sg-section-line" />
                                <span className="sg-section-title">
                                    Availability
                                </span>
                                <div className="sg-section-line" />
                            </div>

                            {availability.map((block, index) => (
                                <div key={index} className="sg-avail-block">
                                    <div className="sg-avail-header">
                                        <span className="sg-avail-title">
                                            <Calendar
                                                size={12}
                                                style={{
                                                    display: "inline",
                                                    marginRight: 5,
                                                }}
                                            />
                                            Slot {index + 1}
                                        </span>
                                        {availability.length > 1 && (
                                            <button
                                                type="button"
                                                className="sg-btn sg-btn-danger sg-btn-sm"
                                                onClick={() =>
                                                    removeTimingBlock(index)
                                                }
                                            >
                                                <Trash2 size={11} /> Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="sg-days">
                                        {days.map((day) => (
                                            <button
                                                type="button"
                                                key={day}
                                                className={`sg-day ${block.days.includes(day) ? "active" : ""}`}
                                                onClick={() =>
                                                    toggleDay(index, day)
                                                }
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>

                                    {block.slots.map((slot, slotIndex) => (
                                        <div key={slotIndex}>
                                            <div className="sg-slot-row">
                                                <div className="sg-field">
                                                    <label className="sg-label">
                                                        Start
                                                    </label>
                                                    <input
                                                        type="time"
                                                        className="sg-input"
                                                        value={slot.startTime}
                                                        onChange={(e) =>
                                                            updateSlotTime(
                                                                index,
                                                                slotIndex,
                                                                "startTime",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="sg-field">
                                                    <label className="sg-label">
                                                        End
                                                    </label>
                                                    <input
                                                        type="time"
                                                        className="sg-input"
                                                        value={slot.endTime}
                                                        onChange={(e) =>
                                                            updateSlotTime(
                                                                index,
                                                                slotIndex,
                                                                "endTime",
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <div className="sg-field">
                                                    <label className="sg-label">
                                                        Gap
                                                    </label>
                                                    <select
                                                        className="sg-select"
                                                        value={
                                                            slot.slotDuration
                                                        }
                                                        onChange={(e) =>
                                                            updateSlotTime(
                                                                index,
                                                                slotIndex,
                                                                "slotDuration",
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        <option value={10}>
                                                            10 min
                                                        </option>
                                                        <option value={15}>
                                                            15 min
                                                        </option>
                                                        <option value={20}>
                                                            20 min
                                                        </option>
                                                        <option value={30}>
                                                            30 min
                                                        </option>
                                                    </select>
                                                </div>
                                                <div
                                                    style={{ paddingBottom: 2 }}
                                                >
                                                    {block.slots.length > 1 && (
                                                        <button
                                                            type="button"
                                                            className="sg-btn sg-btn-danger sg-btn-sm"
                                                            onClick={() =>
                                                                removeTimeSlot(
                                                                    index,
                                                                    slotIndex,
                                                                )
                                                            }
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {slot.startTime && slot.endTime && (
                                                <div className="sg-slot-preview">
                                                    <Clock size={10} />{" "}
                                                    {slot.startTime} →{" "}
                                                    {slot.endTime} ·{" "}
                                                    {slot.slotDuration} min
                                                    slots
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="sg-btn sg-btn-outline sg-btn-sm"
                                        style={{ marginTop: 12 }}
                                        onClick={() => addTimeSlot(index)}
                                    >
                                        <Plus size={11} /> Add Time Slot
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="sg-btn sg-btn-outline"
                                style={{ marginTop: 4 }}
                                onClick={addTimingBlock}
                            >
                                <Plus size={13} /> Add Day Slot
                            </button>

                            {/* ── Professional ── */}
                            <div className="sg-section">
                                <div className="sg-section-line" />
                                <span className="sg-section-title">
                                    Professional Details
                                </span>
                                <div className="sg-section-line" />
                            </div>

                            <div
                                className="sg-field"
                                style={{ marginBottom: 14 }}
                            >
                                <label className="sg-label">
                                    Experience{" "}
                                    <span className="sg-required">*</span>
                                </label>
                                <input
                                    className="sg-input"
                                    name="experience"
                                    onChange={onChange}
                                    placeholder="e.g. 8 years"
                                />
                            </div>

                            <div className="sg-field">
                                <label className="sg-label">
                                    Degree(s){" "}
                                    <span className="sg-required">*</span>
                                </label>
                                {credentials.degrees.map((degree, index) => (
                                    <div key={index} className="sg-degree-row">
                                        <input
                                            className="sg-input"
                                            value={degree}
                                            onChange={(e) =>
                                                handleDegreeChange(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="e.g. MBBS, MD"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="sg-btn sg-btn-danger"
                                            onClick={() =>
                                                removeDegreeField(index)
                                            }
                                            disabled={
                                                credentials.degrees.length === 1
                                            }
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="sg-btn sg-btn-outline sg-btn-sm"
                                    style={{ marginTop: 4 }}
                                    onClick={addDegreeField}
                                >
                                    <Plus size={11} /> Add Degree
                                </button>
                            </div>

                            {/* ── Warn ── */}
                            {!phoneVerified && (
                                <div className="sg-warn">
                                    <ShieldCheck size={16} />
                                    Verify your phone number before creating
                                    account
                                </div>
                            )}

                            {/* ── Terms ── */}
                            <div className="sg-terms">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    className="sg-checkbox"
                                    checked={acceptedTerms}
                                    onChange={(e) =>
                                        setAcceptedTerms(e.target.checked)
                                    }
                                />
                                <label
                                    className="sg-terms-label"
                                    htmlFor="terms"
                                >
                                    I agree to the{" "}
                                    <Link
                                        to="/terms"
                                        target="_blank"
                                        className="sg-terms-link"
                                    >
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

                            <button
                                type="submit"
                                className="sg-btn sg-btn-primary sg-btn-full"
                                style={{ marginTop: 20 }}
                                disabled={!phoneVerified || !acceptedTerms}
                            >
                                <UserPlus size={15} /> Create Account
                            </button>

                            <div
                                className="sg-footer"
                                style={{ marginTop: 20 }}
                            >
                                Already have an account?{" "}
                                <Link to="/login">Sign in</Link>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Signup;
