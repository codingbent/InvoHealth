import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ServiceList from "./ServiceList";
import { UserPlus, X, Check, CalendarArrowDown } from "lucide-react";
import SlotPicker from "./Slotpicker";
import "flatpickr/dist/themes/dark.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { addPatient } from "../api/patient.api";
import { addAppointment } from "../api/appointment.api";
import { uploadImageAPI } from "../api/upload.api";
import { useSlots } from "../hooks/useSlots";
import { fetchPaymentMethods } from "../api/payment.api";
import SuccessOverlay from "./SuccessOverlay";
import { getTodayLocal } from "./utils/dateutils";
// import "../css/Fxsuccess.css";
import "../css/Addpatient.css";

const AddPatient = ({
    showAlert,
    showModal,
    setShowModal,
    currency,
    usage,
    // updateUsage,
    services,
    availability,
}) => {
    const [patient, setPatient] = useState({
        name: "",
        service: [],
        number: "",
        email: "",
        amount: 0,
        age: "",
        gender: "Male",
    });
    const formatTime = (time) => time;
    const availableServices = services || [];
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [payment_type, setPaymentType] = useState("");
    const [collectFull, setCollectFull] = useState(true);
    const { name, service, number, email, age, gender } = patient;
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [openSection, setOpenSection] = useState("Morning");
    const [showCalendar, setShowCalendar] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [appointmentDate, setAppointmentDate] = useState(getTodayLocal());
    const imageUsage = usage?.images || { used: 0, limit: 0 };
    const [loading, setLoading] = useState(false);
    const isImageLimitReached =
        imageUsage.limit !== -1 && imageUsage.used >= imageUsage.limit;
    const { timeSlots, bookedSlots, groupedSlots } = useSlots(
        availability,
        appointmentDate,
        showModal,
    );
    const fileInputRef = useRef(null);
    const fmt = (value) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency?.currency || "INR",
            minimumFractionDigits: 0,
        }).format(value);

    useEffect(() => {
        const loadPayments = async () => {
            try {
                const data = await fetchPaymentMethods();
                setPaymentOptions(data);
            } catch (err) {
                showAlert("Failed to load payment methods", "danger");
            }
        };

        loadPayments();
    }, [showAlert]);

    const isToday = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return appointmentDate === today;
    }, [appointmentDate]);

    const currentSlot = useMemo(() => {
        if (!timeSlots.length) return null;

        //  if future date → return first available
        if (!isToday) {
            return (
                timeSlots.find((slot) => !bookedSlots.includes(slot)) || null
            );
        }

        //  today logic
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let index = -1;

        for (let i = 0; i < timeSlots.length; i++) {
            const [h, m] = timeSlots[i].split(":").map(Number);
            const minutes = h * 60 + m;

            if (minutes <= currentMinutes) {
                index = i;
            } else break;
        }

        if (index === -1) index = 0;

        for (let i = index; i < timeSlots.length; i++) {
            if (!bookedSlots.includes(timeSlots[i])) {
                return timeSlots[i];
            }
        }

        for (let i = index - 1; i >= 0; i--) {
            if (!bookedSlots.includes(timeSlots[i])) {
                return timeSlots[i];
            }
        }

        return null;
    }, [timeSlots, bookedSlots, isToday]);

    const nextSlot = useMemo(() => {
        if (!currentSlot || !timeSlots.length) return null;

        let index = timeSlots.indexOf(currentSlot);

        //  FIX: if not found, find closest slot
        if (index === -1) {
            const [h, m] = currentSlot.split(":").map(Number);
            const currentMinutes = h * 60 + m;

            index =
                timeSlots.findIndex((slot) => {
                    const [sh, sm] = slot.split(":").map(Number);
                    return sh * 60 + sm > currentMinutes;
                }) - 1;

            if (index < 0) index = 0;
        }

        //  forward search only
        for (let i = index + 1; i < timeSlots.length; i++) {
            if (!bookedSlots.includes(timeSlots[i])) {
                return timeSlots[i];
            }
        }

        return null;
    }, [timeSlots, currentSlot, bookedSlots]);

    useEffect(() => {
        if (currentSlot) setSelectedSlot(currentSlot);
    }, [currentSlot]);

    const serviceTotal = useMemo(
        () =>
            service.reduce(
                (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
                0,
            ),
        [service, serviceAmounts],
    );

    const finalAmount = serviceTotal;
    useEffect(() => {
        setPatient((prev) => ({ ...prev, amount: finalAmount }));
    }, [finalAmount]);

    const calculatedDiscount = useMemo(() => {
        if (!discount || discount <= 0) return 0;
        return Math.round(
            isPercent ? (finalAmount * discount) / 100 : discount,
        );
    }, [discount, isPercent, finalAmount]);

    const remainingAmount = Math.max(
        finalAmount - patient.amount - calculatedDiscount,
        0,
    );

    useEffect(() => {
        if (collectFull) {
            const auto = Math.max(
                Math.round(finalAmount - calculatedDiscount),
                0,
            );
            setPatient((prev) => ({ ...prev, amount: auto }));
        }
    }, [calculatedDiscount, finalAmount, collectFull]);

    const resetForm = () => {
        setPatient({
            name: "",
            service: [],
            number: "",
            email: "",
            amount: 0,
            age: "",
            gender: "Male",
        });
        setServiceAmounts({});
        setDiscount(0);
        setIsPercent(false);
        setCollectFull(true);
        setAppointmentDate(appointmentDate);
        setPaymentType("");
        setSelectedSlot("");
        setImageFile(null);
        setImagePreview("");
    };

    const onChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        if (service.length === 0) {
            return showAlert("Select at least one service", "warning");
        }

        if (number.length !== 10) {
            return showAlert("Invalid phone number", "warning");
        }

        if (!payment_type) {
            return showAlert("Select payment type", "warning");
        }

        if (!selectedSlot) {
            return showAlert("Select time slot", "warning");
        }

        setLoading(true);

        try {
            var imageUrl = null;

            if (imageFile) {
                imageUrl = await uploadImageAPI(imageFile);
            }

            const patientRes = await addPatient({
                name,
                gender,
                number,
                email,
                age,
            });

            if (!patientRes.success) {
                // showAlert(patientRes.error, "danger");
                setLoading(false);
                return;
            }

            const patientId = patientRes.patient._id;

            const formData = new FormData();

            formData.append("patientId", patientId);
            formData.append("collected", patient.amount);
            formData.append("date", appointmentDate);
            formData.append("time", selectedSlot);
            formData.append("payment_type", payment_type);
            formData.append("image", imageUrl);

            // services
            formData.append(
                "services",
                JSON.stringify(
                    service.map((s) => ({
                        id: s._id,
                        name: s.name,
                        amount: serviceAmounts[s._id] ?? s.amount,
                    })),
                ),
            );

            // image (use file, not URL)
            if (imageFile) {
                formData.append("image", imageFile);
            }

            const appointmentRes = await addAppointment(formData);

            if (appointmentRes.success) {
                setShowSuccess(true);
                resetForm(); // USE IT HERE
            } else {
                showAlert("Failed to create appointment", "danger");
            }
        } catch (err) {
            showAlert("Server error", "danger");
        } finally {
            setLoading(false);
        }
    };

    const handleAddService = useCallback((s) => {
        setPatient((prev) =>
            prev.service.some((x) => x._id === s._id)
                ? prev
                : { ...prev, service: [...prev.service, s] },
        );

        setServiceAmounts((prev) => ({
            ...prev,
            [s._id]: s.amount ?? 0,
        }));
    }, []);

    const handleRemoveService = useCallback((id) => {
        setPatient((prev) => ({
            ...prev,
            service: prev.service.filter((s) => s._id !== id),
        }));

        setServiceAmounts((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    }, []);

    const statusColor =
        patient.amount >= finalAmount - calculatedDiscount
            ? "#4ade80"
            : patient.amount > 0
              ? "#fb923c"
              : "#f87171";

    const statusLabel =
        patient.amount >= finalAmount - calculatedDiscount
            ? "Paid"
            : patient.amount > 0
              ? "Partial"
              : "Unpaid";

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
                                    Full Name
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <input
                                    id="name"
                                    className="ap-input"
                                    name="name"
                                    value={name}
                                    onChange={onChange}
                                    placeholder="Patient name"
                                    required
                                />
                            </div>
                            <div className="ap-field">
                                <label htmlFor="gender" className="ap-label">
                                    Gender
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>

                                <select
                                    id="gender"
                                    name="gender"
                                    className="ap-select"
                                    value={gender}
                                    onChange={onChange}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="ap-field">
                                <label htmlFor="age" className="ap-label">
                                    Age
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <input
                                    id="age"
                                    className="ap-input"
                                    type="number"
                                    name="age"
                                    value={age}
                                    onChange={onChange}
                                    placeholder="Age"
                                />
                            </div>
                        </div>
                        <div className="ap-field">
                            <label htmlFor="number" className="ap-label">
                                Mobile Number
                                <span className="sg-required">
                                    <sup>*</sup>
                                </span>
                            </label>
                            <input
                                id="number"
                                className="ap-input"
                                type="tel"
                                name="number"
                                value={number}
                                placeholder="Mobile number"
                                onChange={(e) => {
                                    const d = e.target.value.replace(/\D/g, "");
                                    if (d.length <= 10)
                                        setPatient({
                                            ...patient,
                                            number: d,
                                        });
                                }}
                            />
                        </div>
                        <div className="ap-field">
                            <label htmlFor="email" className="ap-label">
                                Email
                            </label>
                            <input
                                id="email"
                                className="ap-input"
                                type="email"
                                name="email"
                                value={patient.email}
                                placeholder="Enter email"
                                onChange={onChange}
                            />
                        </div>

                        {/* Services */}
                        <div className="ap-section">
                            Services & Billing
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                        </div>
                        <ServiceList
                            services={availableServices}
                            selectedServices={service}
                            currency={currency}
                            onAdd={handleAddService}
                            onRemove={handleRemoveService}
                        />

                        {service.length > 0 && (
                            <>
                                <div style={{ marginTop: 12 }}>
                                    {service.map((s) => (
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
                                                    name={`serviceAmount-${s._id}`}
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
                                        max={isPercent ? 100 : finalAmount}
                                        onChange={(e) => {
                                            let v = Number(e.target.value);
                                            if (v < 0) v = 0;
                                            if (isPercent && v > 100) v = 100;
                                            if (!isPercent && v > finalAmount)
                                                v = finalAmount;
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
                                            {fmt(finalAmount)}
                                        </span>
                                    </div>
                                    {calculatedDiscount > 0 && (
                                        <div className="ap-summary-row">
                                            <span>Discount</span>
                                            <span
                                                className="ap-summary-val"
                                                style={{
                                                    color: "#fb923c",
                                                }}
                                            >
                                                - {fmt(calculatedDiscount)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="ap-summary-row final">
                                        <span>Payable Amount</span>
                                        <span className="ap-summary-val">
                                            {fmt(
                                                Math.max(
                                                    finalAmount -
                                                        calculatedDiscount,
                                                    0,
                                                ),
                                            )}
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
                                            name="collectedAmount"
                                            className="ap-amount-input"
                                            value={patient.amount.toFixed(2)}
                                            disabled={collectFull}
                                            onChange={(e) =>
                                                setPatient((prev) => ({
                                                    ...prev,
                                                    amount: Number(
                                                        e.target.value,
                                                    ),
                                                }))
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
                                        {statusLabel}
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
                                id="fileInput"
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
                                            `Image limit reached (${usage?.images?.used}/${usage?.images?.limit}). Upgrade plan 🚀`,
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
                        {/* Appointment */}
                        <div className="ap-section">Appointment & Payment</div>
                        <div className="ap-grid2">
                            <div className="ap-field">
                                <label
                                    htmlFor="appointment-date"
                                    className="ap-label"
                                >
                                    Date
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>

                                <button
                                    id="appointment-date"
                                    name="appointmentDate"
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
                                    <span
                                        style={{
                                            fontSize: 13,
                                            color: "#3a4a6b",
                                        }}
                                    >
                                        <CalendarArrowDown size={18} />
                                    </span>
                                </button>

                                {/* Calendar dropdown */}
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
                                    Payment Type
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>

                                <select
                                    className="ap-select"
                                    value={payment_type}
                                    onChange={(e) =>
                                        setPaymentType(e.target.value)
                                    }
                                >
                                    <option value="">Select Payment</option>

                                    {paymentOptions.map((p) => (
                                        <option
                                            key={p.id}
                                            value={p.subCategoryName}
                                        >
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
                            formatTime={formatTime}
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
                            disabled={service.length === 0 || loading}
                        >
                            {loading ? (
                                "Saving..."
                            ) : (
                                <>
                                    {" "}
                                    <Check size={13} /> Save & Create{" "}
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
