import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ServiceList from "./ServiceList";
import { UserPlus, X, Check, CalendarArrowDown } from "lucide-react";
import SlotPicker from "./Slotpicker";
import "flatpickr/dist/themes/dark.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addPatient } from "../api/patient.api";
import { addAppointment } from "../api/appointment.api";
import { useSlots } from "../hooks/useSlots";
import { fetchPaymentMethods } from "../api/payment.api";
import SuccessOverlay from "./SuccessOverlay";
import { getTodayLocal } from "./utils/dateutils";
import "../css/Addpatient.css";
import { fetchCountries } from "../api/country.api";

const AddPatient = ({
    showAlert,
    showModal,
    setShowModal,
    currency,
    usage,
    services,
    availability,
    doctor,
}) => {
    // ── Patient fields ────────────────────────────────────────────────────────
    const [name, setName] = useState("");
    const [number, setNumber] = useState("");
    const [email, setEmail] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("Male");

    // ── Country ───────────────────────────────────────────────────────────────
    // FIX #4: Single declaration of selectedCountryId (removed duplicate useEffect)
    const [selectedCountryId, setSelectedCountryId] = useState("");
    const [countries, setCountries] = useState([]);

    // ── Services & billing ────────────────────────────────────────────────────
    const [selectedServices, setSelectedServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [collectFull, setCollectFull] = useState(true);
    const [collectedAmount, setCollectedAmount] = useState(0);

    // ── Appointment ───────────────────────────────────────────────────────────
    const [appointmentDate, setAppointmentDate] = useState(getTodayLocal());
    const [selectedSlot, setSelectedSlot] = useState("");
    const [openSection, setOpenSection] = useState("Morning");
    const [showCalendar, setShowCalendar] = useState(false);

    // ── Payment ───────────────────────────────────────────────────────────────
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [selectedPaymentId, setSelectedPaymentId] = useState("");

    // ── Image ─────────────────────────────────────────────────────────────────
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const fileInputRef = useRef(null);

    // ── UI ────────────────────────────────────────────────────────────────────
    const [showSuccess, setShowSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const availableServices = services || [];
    const imageUsage = usage?.images || { used: 0, limit: 0 };
    const isImageLimitReached =
        imageUsage.limit !== -1 && imageUsage.used >= imageUsage.limit;

    const { timeSlots, bookedSlots, groupedSlots } = useSlots(
        availability,
        appointmentDate,
        showModal,
    );

    const fmt = (value) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency?.code || "INR",
            minimumFractionDigits: 0,
        }).format(value);

    // ── Load payment methods ──────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchPaymentMethods();
                setPaymentOptions(data);
            } catch {
                showAlert("Failed to load payment methods", "danger");
            }
        };
        load();
    }, [showAlert]);

    // ── Load countries ────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchCountries();
                setCountries(data || []);
            } catch (err) {
                console.error("Country fetch failed", err);
                setCountries([]);
            }
        };
        load();
    }, []);

    // FIX #4: Single useEffect to prefill country from doctor — not duplicated
    useEffect(() => {
        if (doctor?.address?.countryId) {
            setSelectedCountryId(doctor.address.countryId);
        }
    }, [doctor]);

    // ── Auto-select current slot ──────────────────────────────────────────────
    const isToday = useMemo(() => {
        return appointmentDate === new Date().toISOString().slice(0, 10);
    }, [appointmentDate]);

    const currentSlot = useMemo(() => {
        if (!timeSlots.length) return null;
        if (!isToday)
            return timeSlots.find((s) => !bookedSlots.includes(s)) || null;

        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        let idx = -1;
        for (let i = 0; i < timeSlots.length; i++) {
            const [h, m] = timeSlots[i].split(":").map(Number);
            if (h * 60 + m <= cur) idx = i;
            else break;
        }
        if (idx === -1) idx = 0;
        for (let i = idx; i < timeSlots.length; i++)
            if (!bookedSlots.includes(timeSlots[i])) return timeSlots[i];
        for (let i = idx - 1; i >= 0; i--)
            if (!bookedSlots.includes(timeSlots[i])) return timeSlots[i];
        return null;
    }, [timeSlots, bookedSlots, isToday]);

    const nextSlot = useMemo(() => {
        if (!currentSlot || !timeSlots.length) return null;
        let idx = timeSlots.indexOf(currentSlot);
        if (idx === -1) {
            const [h, m] = currentSlot.split(":").map(Number);
            const cur = h * 60 + m;
            idx =
                timeSlots.findIndex((s) => {
                    const [sh, sm] = s.split(":").map(Number);
                    return sh * 60 + sm > cur;
                }) - 1;
            if (idx < 0) idx = 0;
        }
        for (let i = idx + 1; i < timeSlots.length; i++)
            if (!bookedSlots.includes(timeSlots[i])) return timeSlots[i];
        return null;
    }, [timeSlots, currentSlot, bookedSlots]);

    const isInitialMount = useRef(true);
    useEffect(() => {
        if (isInitialMount.current && currentSlot) {
            setSelectedSlot(currentSlot);
            isInitialMount.current = false;
        }
    }, [currentSlot]);

    // ── Billing calculations (all derived, no state) ──────────────────────────
    const serviceTotal = useMemo(
        () =>
            selectedServices.reduce(
                (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
                0,
            ),
        [selectedServices, serviceAmounts],
    );

    const calculatedDiscount = useMemo(() => {
        if (!discount || discount <= 0) return 0;
        const raw = isPercent ? (serviceTotal * discount) / 100 : discount;
        return Math.min(Math.round(raw), serviceTotal);
    }, [discount, isPercent, serviceTotal]);

    // finalAmount = what patient owes after discount
    const finalAmount = Math.max(serviceTotal - calculatedDiscount, 0);

    useEffect(() => {
        if (collectFull) {
            setCollectedAmount(finalAmount);
        }
    }, [collectFull, finalAmount]);

    const remainingAmount = Math.max(finalAmount - collectedAmount, 0);

    const paymentStatus =
        remainingAmount <= 0
            ? "Paid"
            : collectedAmount > 0
              ? "Partial"
              : "Unpaid";

    const statusColor =
        paymentStatus === "Paid"
            ? "#4ade80"
            : paymentStatus === "Partial"
              ? "#fb923c"
              : "#f87171";

    // ── Reset ─────────────────────────────────────────────────────────────────
    const resetForm = useCallback(() => {
        setName("");
        setEmail("");
        setAge("");
        setGender("Male");
        setSelectedServices([]);
        setServiceAmounts({});
        setDiscount(0);
        setIsPercent(false);
        setCollectFull(true);
        setCollectedAmount(0);
        setSelectedPaymentId("");
        setSelectedSlot("");
        setImageFile(null);
        setImagePreview("");
    }, []);

    // ── Service handlers ──────────────────────────────────────────────────────
    const handleAddService = useCallback((s) => {
        setSelectedServices((prev) =>
            prev.some((x) => x._id === s._id) ? prev : [...prev, s],
        );
        setServiceAmounts((prev) => ({
            ...prev,
            [s._id]: s.amount ?? 0,
        }));
    }, []);

    const handleRemoveService = useCallback((id) => {
        setSelectedServices((prev) => prev.filter((s) => s._id !== id));
        setServiceAmounts((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    }, []);

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        // Validations — these must NOT reset the form
        if (selectedServices.length === 0)
            return showAlert("Select at least one service", "warning");

        if (!/^\d{7,15}$/.test(number)) {
            return showAlert(
                "Enter a valid phone number (7-15 digits)",
                "warning",
            );
        }

        if (!selectedPaymentId)
            return showAlert("Select payment type", "warning");

        if (!selectedSlot) return showAlert("Select a time slot", "warning");

        setLoading(true);

        try {
            if (!selectedCountryId) {
                return showAlert("Select country", "warning");
            }

            const patientRes = await addPatient({
                name,
                gender,
                countryId: selectedCountryId,
                number: number.trim(),
                email,
                age,
            });

            console.log(patientRes);

            if (!patientRes.success) {
                showAlert(
                    patientRes.message || "Failed to create patient",
                    "danger",
                );
                return;
            }

            const newPatientId = patientRes.patient._id;
            const formData = new FormData();

            formData.append("patientId", newPatientId);
            formData.append("amount", finalAmount);
            formData.append("collected", collectedAmount);
            formData.append("remaining", remainingAmount);
            formData.append("status", paymentStatus);
            formData.append("date", appointmentDate);
            formData.append("time", selectedSlot);
            formData.append("discount", discount);
            formData.append("isPercent", isPercent);
            formData.append("paymentMethodId", selectedPaymentId);

            const selectedPaymentOption = paymentOptions.find(
                (p) => String(p.id || p._id) === String(selectedPaymentId),
            );

            if (selectedPaymentOption) {
                formData.append(
                    "categoryName",
                    selectedPaymentOption.subCategoryName ||
                        selectedPaymentOption.categoryName ||
                        "",
                );
            }

            formData.append(
                "services",
                JSON.stringify(
                    selectedServices.map((s) => ({
                        id: s._id,
                        name: s.name,
                        amount: serviceAmounts[s._id] ?? s.amount,
                    })),
                ),
            );

            if (imageFile) {
                formData.append("image", imageFile);
            }

            const appointmentRes = await addAppointment(formData);

            if (appointmentRes.success) {
                setShowSuccess(true);
                resetForm();
            } else {
                showAlert(
                    appointmentRes.message || "Failed to create appointment",
                    "danger",
                );
            }
        } catch (err) {
            console.error(err);
            showAlert("Server error. Please try again.", "danger");
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="modal-content">
                <SuccessOverlay
                    visible={showSuccess}
                    onDone={() => {
                        setShowSuccess(false);
                        showAlert("Patient & Appointment created", "success");
                        setShowModal(false);
                    }}
                    title="Patient Created"
                    sub="Appointment booked"
                    variant="green"
                    duration={1600}
                />
                <div className="ap-header">
                    <div className="ap-header-left">
                        <div className="ap-header-icon">
                            <UserPlus size={15} />
                        </div>
                        <div>
                            <div className="ap-title">
                                Add <em>Patient</em>
                            </div>
                            <div className="ap-subtitle">
                                Create patient & initial appointment
                            </div>
                        </div>
                    </div>
                    <button
                        className="ap-close"
                        onClick={() => setShowModal(false)}
                    >
                        <X size={13} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="ap-body">
                        {/* Patient Details */}
                        <div className="ap-section">Patient Details</div>
                        <div className="ap-grid3">
                            <div
                                className="ap-field"
                                style={{ gridColumn: "span 1" }}
                            >
                                <label htmlFor="name" className="ap-label">
                                    Full Name{" "}
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <input
                                    id="name"
                                    className="ap-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Patient name"
                                    required
                                />
                            </div>
                            <div className="ap-field">
                                <label htmlFor="gender" className="ap-label">
                                    Gender{" "}
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <select
                                    id="gender"
                                    className="ap-select"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="ap-field">
                                <label htmlFor="age" className="ap-label">
                                    Age{" "}
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <input
                                    id="age"
                                    className="ap-input"
                                    type="number"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    placeholder="Age"
                                />
                            </div>
                        </div>

                        <div className="ap-field">
                            <label htmlFor="number" className="ap-label">
                                Phone{" "}
                                <span className="sg-required">
                                    <sup>*</sup>
                                </span>
                            </label>

                            <div className="ap-phone-group">
                                {/* COUNTRY */}
                                <select
                                    className="ap-input ap-country"
                                    value={selectedCountryId || ""}
                                    onChange={(e) =>
                                        setSelectedCountryId(e.target.value)
                                    }
                                >
                                    <option value="">Country</option>
                                    {countries.map((c) => (
                                        <option key={c._id} value={c._id}>
                                            {c.name} ({c.dialCode})
                                        </option>
                                    ))}
                                </select>

                                {/* PHONE */}
                                <input
                                    id="number"
                                    className="ap-input ap-phone"
                                    type="tel"
                                    value={number}
                                    placeholder="Phone number"
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(
                                            /\D/g,
                                            "",
                                        );
                                        if (digits.length <= 15)
                                            setNumber(digits);
                                    }}
                                />
                            </div>
                        </div>
                        <div className="ap-field">
                            <label htmlFor="email" className="ap-label">
                                Email
                            </label>
                            <input
                                id="email"
                                className="ap-input"
                                type="email"
                                value={email}
                                placeholder="Enter email (optional)"
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <div
                                style={{
                                    fontSize: "11px",
                                    color: "#9ba9c3",
                                    marginTop: "6px",
                                    lineHeight: "1.4",
                                }}
                            >
                                Add email to automatically send invoice after
                                appointment.
                            </div>
                        </div>

                        {/* ── Services & Billing ── */}
                        <div className="ap-section">
                            Services & Billing{" "}
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                        </div>
                        <ServiceList
                            services={availableServices}
                            selectedServices={selectedServices}
                            currency={currency}
                            onAdd={handleAddService}
                            onRemove={handleRemoveService}
                        />

                        {selectedServices.length > 0 && (
                            <>
                                <div style={{ marginTop: 12 }}>
                                    {selectedServices.map((s) => (
                                        <div
                                            key={s._id}
                                            className="ap-service-row"
                                        >
                                            <span className="ap-service-name">
                                                {s.name}
                                            </span>
                                            <div className="ap-amount-wrap">
                                                {currency?.symbol}
                                                <input
                                                    type="number"
                                                    className="ap-amount-input"
                                                    value={
                                                        serviceAmounts[s._id] ??
                                                        s.amount
                                                    }
                                                    onChange={(e) =>
                                                        setServiceAmounts(
                                                            (prev) => ({
                                                                ...prev,
                                                                [s._id]: Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            }),
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Discount */}
                                <div
                                    className="ap-discount-row"
                                    style={{ marginTop: 10 }}
                                >
                                    <label
                                        className="ap-label"
                                        style={{
                                            margin: 0,
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        Discount
                                    </label>
                                    <input
                                        type="number"
                                        className="ap-input"
                                        placeholder="0"
                                        value={discount}
                                        min={0}
                                        max={isPercent ? 100 : serviceTotal}
                                        onChange={(e) => {
                                            let v = Number(e.target.value);
                                            if (v < 0) v = 0;
                                            if (isPercent && v > 100) v = 100;
                                            if (!isPercent && v > serviceTotal)
                                                v = serviceTotal;
                                            setDiscount(v);
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                    <label
                                        className={`ap-percent-toggle ${isPercent ? "on" : ""}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isPercent}
                                            onChange={(e) =>
                                                setIsPercent(e.target.checked)
                                            }
                                        />
                                        % Percent
                                    </label>
                                </div>

                                {/* Summary */}
                                <div className="ap-summary">
                                    <div className="ap-summary-row">
                                        <span>Subtotal</span>
                                        <span className="ap-summary-val">
                                            {fmt(serviceTotal)}
                                        </span>
                                    </div>
                                    {calculatedDiscount > 0 && (
                                        <div className="ap-summary-row">
                                            <span>Discount</span>
                                            <span
                                                className="ap-summary-val"
                                                style={{ color: "#fb923c" }}
                                            >
                                                - {fmt(calculatedDiscount)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="ap-summary-row final">
                                        <span>Payable Amount</span>
                                        <span className="ap-summary-val">
                                            {fmt(finalAmount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Collected */}
                                <div className="ap-collected-row">
                                    <span className="ap-collect-label">
                                        Amount Collected{" "}
                                        {collectFull && (
                                            <span
                                                style={{
                                                    color: "#2e3d5c",
                                                    fontSize: 10,
                                                }}
                                            >
                                                (Auto)
                                            </span>
                                        )}
                                    </span>
                                    <div className="ap-amount-wrap">
                                        {currency?.symbol}
                                        <input
                                            type="number"
                                            className="ap-amount-input"
                                            value={collectedAmount}
                                            disabled={collectFull}
                                            min={0}
                                            max={finalAmount}
                                            onChange={(e) =>
                                                setCollectedAmount(
                                                    Math.min(
                                                        Number(e.target.value),
                                                        finalAmount,
                                                    ),
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                                <label className="ap-checkbox-row">
                                    <input
                                        type="checkbox"
                                        className="ap-checkbox"
                                        checked={collectFull}
                                        onChange={(e) =>
                                            setCollectFull(e.target.checked)
                                        }
                                    />
                                    Collect full payable amount automatically
                                </label>

                                {/* Status */}
                                <div
                                    className="ap-status"
                                    style={{
                                        color:
                                            remainingAmount === 0
                                                ? "#ffffff"
                                                : "var(--danger)",
                                    }}
                                >
                                    <span>
                                        Remaining: {fmt(remainingAmount)}
                                    </span>
                                    <span
                                        className="ap-status-badge"
                                        style={{
                                            background: `${statusColor}12`,
                                            borderColor: `${statusColor}30`,
                                            color: statusColor,
                                        }}
                                    >
                                        {paymentStatus}
                                    </span>
                                </div>
                            </>
                        )}

                        <div className="ap-field">
                            <div className="ap-section">
                                <label
                                    className="ap-label"
                                    style={{ margin: 0 }}
                                >
                                    Upload Image
                                    <span
                                        style={{
                                            fontSize: 9,
                                            marginLeft: 6,
                                            textTransform: "none",
                                            letterSpacing: 0,
                                        }}
                                    >
                                        — max 2 MB
                                    </span>
                                </label>
                                <div className="ap-upload-meta">
                                    <span
                                        className={`ap-upload-count ${isImageLimitReached ? "limit-hit" : ""}`}
                                    >
                                        {imageUsage.used}/
                                        {imageUsage.limit === -1
                                            ? "∞"
                                            : imageUsage.limit}
                                    </span>
                                    {isImageLimitReached && (
                                        <span className="ap-limit-badge">
                                            Limit Reached
                                        </span>
                                    )}
                                </div>
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                disabled={isImageLimitReached}
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    if (!file.type.startsWith("image/")) {
                                        showAlert(
                                            "Only images allowed",
                                            "warning",
                                        );
                                        return;
                                    }
                                    if (file.size > 2 * 1024 * 1024) {
                                        showAlert(
                                            "Image must be under 2 MB",
                                            "warning",
                                        );
                                        return;
                                    }
                                    setImageFile(file);
                                    setImagePreview(URL.createObjectURL(file));
                                }}
                            />

                            <button
                                type="button"
                                className={`ap-upload-btn ${isImageLimitReached ? "ap-upload-btn--disabled" : ""}`}
                                disabled={isImageLimitReached}
                                onClick={() => {
                                    if (isImageLimitReached) {
                                        showAlert(
                                            `Image limit reached (${imageUsage.used}/${imageUsage.limit}). Upgrade plan.`,
                                            "warning",
                                        );
                                        return;
                                    }
                                    fileInputRef.current?.click();
                                }}
                            >
                                ↑ Upload Image
                            </button>

                            {imagePreview && (
                                <div className="ap-upload-preview">
                                    <img
                                        src={imagePreview}
                                        alt="preview"
                                        className="ap-preview-img"
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="ap-preview-name">
                                            {imageFile?.name}
                                        </div>
                                        <div className="ap-preview-size">
                                            {(imageFile?.size / 1024).toFixed(
                                                0,
                                            )}{" "}
                                            KB
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="ap-upload-remove"
                                        onClick={() => {
                                            setImageFile(null);
                                            setImagePreview("");
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Appointment & Payment ── */}
                        <div className="ap-section">Appointment & Payment</div>

                        <div className="ap-grid2">
                            <div className="ap-field">
                                <label
                                    htmlFor="appointment-date"
                                    className="ap-label"
                                >
                                    Date{" "}
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <button
                                    id="appointment-date"
                                    type="button"
                                    className="ap-input"
                                    onClick={() => setShowCalendar((p) => !p)}
                                    style={{
                                        textAlign: "left",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <span
                                        style={{
                                            color: appointmentDate
                                                ? "#c5d0e8"
                                                : "#252e45",
                                        }}
                                    >
                                        {appointmentDate
                                            ? new Date(
                                                  appointmentDate,
                                              ).toLocaleDateString("en-IN", {
                                                  day: "numeric",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "Select date"}
                                    </span>
                                    <CalendarArrowDown
                                        size={18}
                                        style={{ color: "#3a4a6b" }}
                                    />
                                </button>
                                {showCalendar && (
                                    <div
                                        className="dp-wrapper"
                                        style={{
                                            position: "absolute",
                                            zIndex: 100,
                                            marginTop: 4,
                                        }}
                                    >
                                        <DayPicker
                                            mode="single"
                                            selected={
                                                appointmentDate
                                                    ? new Date(appointmentDate)
                                                    : undefined
                                            }
                                            onSelect={(date) => {
                                                if (!date) return;
                                                setAppointmentDate(
                                                    date.toLocaleDateString(
                                                        "en-CA",
                                                    ),
                                                );
                                                setShowCalendar(false);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="ap-field">
                                <label
                                    htmlFor="payment_type"
                                    className="ap-label"
                                >
                                    Payment Type{" "}
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>

                                <select
                                    id="payment_type"
                                    className="ap-select"
                                    value={selectedPaymentId}
                                    onChange={(e) =>
                                        setSelectedPaymentId(e.target.value)
                                    }
                                >
                                    <option value="">Select Payment</option>
                                    {paymentOptions.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.subCategoryName
                                                ? p.subCategoryName
                                                : p.categoryName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <SlotPicker
                            groupedSlots={groupedSlots}
                            selectedSlot={selectedSlot}
                            setSelectedSlot={setSelectedSlot}
                            bookedSlots={bookedSlots}
                            openSection={openSection}
                            setOpenSection={setOpenSection}
                            formatTime={(t) => t}
                            currentSlot={currentSlot}
                            nextSlot={nextSlot}
                        />
                    </div>

                    <div className="ap-footer">
                        <button
                            type="button"
                            className="ap-btn ap-btn-outline"
                            onClick={() => setShowModal(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="ap-btn ap-btn-primary"
                            disabled={selectedServices.length === 0 || loading}
                        >
                            {loading ? (
                                "Saving..."
                            ) : (
                                <>
                                    <Check size={13} /> Save & Create
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

export default AddPatient;
