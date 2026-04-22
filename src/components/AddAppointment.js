import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ServiceList from "./ServiceList";
import {
    Plus,
    Search,
    User,
    CalendarDays,
    CreditCard,
    CheckCircle,
} from "lucide-react";
import SlotPicker from "./Slotpicker";
import { DayPicker } from "react-day-picker";
import { fetchPaymentMethods } from "../api/payment.api";
// eslint-disable-next-line
import { uploadImageAPI } from "../api/upload.api";
import { addAppointment } from "../api/appointment.api";
import { useSlots } from "../hooks/useSlots";
import { fetchAvailability } from "../api/availability.api";
import { fetchServices } from "../api/service.api";
import { searchPatients } from "../api/patientSearch.api";
import SuccessOverlay from "./SuccessOverlay";
import { getTodayLocal } from "./utils/dateutils";
// import "../css/Fxsuccess.css";
import "../css/Addappointment.css";

export default function AddAppointment({ showAlert, currency, usage }) {
    const [searchText, setSearchText] = useState("");
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [collected, setCollected] = useState(0);
    const [allServices, setAllServices] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    // eslint-disable-next-line
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState(getTodayLocal());
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [selectedPaymentId, setSelectedPaymentId] = useState("");
    const [manualOverride, setManualOverride] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [availability, setAvailability] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [openSection, setOpenSection] = useState("Morning");
    const [image, setImage] = useState(null);
    const [total, setTotal] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);
    const [showCalendar, setShowCalendar] = useState(false);
    const isImageLimitReached = usage?.images?.isLimitReached;

    const fileInputRef = useRef(null);
    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);
    const discountValue = Math.min(
        isPercent ? (total * discount) / 100 : discount,
        total,
    );

    const { timeSlots, bookedSlots, groupedSlots } = useSlots(
        availability,
        appointmentDate,
        true,
    );

    const selectedPayment = paymentOptions.find(
        (p) => String(p.id) === String(selectedPaymentId),
    );

    const isToday = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return appointmentDate === today;
    }, [appointmentDate]);

    const currentSlot = useMemo(() => {
        if (!timeSlots.length) return null;
        if (!isToday)
            return (
                timeSlots.find((slot) => !bookedSlots.includes(slot)) || null
            );
        const now = new Date(),
            currentMinutes = now.getHours() * 60 + now.getMinutes();
        let index = -1;
        for (let i = 0; i < timeSlots.length; i++) {
            const [h, m] = timeSlots[i].split(":").map(Number);
            if (h * 60 + m <= currentMinutes) index = i;
            else break;
        }
        if (index === -1) index = 0;
        for (let i = index; i < timeSlots.length; i++) {
            if (!bookedSlots.includes(timeSlots[i])) return timeSlots[i];
        }
        for (let i = index - 1; i >= 0; i--) {
            if (!bookedSlots.includes(timeSlots[i])) return timeSlots[i];
        }
        return null;
    }, [timeSlots, bookedSlots, isToday]);

    const remaining = Math.max(finalAmount - collected, 0);
    const status =
        remaining === 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

    const handleAddService = useCallback((s) => {
        setServices((prev) =>
            prev.some((x) => x._id === s._id) ? prev : [...prev, s],
        );
    }, []);

    const handleRemoveService = useCallback((id) => {
        setServices((prev) => prev.filter((s) => s._id !== id));

        setServiceAmounts((prev) => {
            const copy = { ...prev };
            delete copy[id];
            return copy;
        });
    }, []);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchAvailability();
                setAvailability(data);
            } catch {}
        };
        load();
    }, []);

    const nextSlot = useMemo(() => {
        if (!currentSlot || !timeSlots.length) return null;
        let index = timeSlots.indexOf(currentSlot);
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
        for (let i = index + 1; i < timeSlots.length; i++) {
            if (!bookedSlots.includes(timeSlots[i])) return timeSlots[i];
        }
        return null;
    }, [timeSlots, currentSlot, bookedSlots]);

    useEffect(() => {
        if (currentSlot) setSelectedSlot(currentSlot);
    }, [currentSlot]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchServices();
                setAllServices(data);
            } catch {
                showAlert("Failed to load services", "danger");
            }
        };
        load();
    }, [showAlert]);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await fetchPaymentMethods();
                setPaymentOptions(data);
            } catch {
                showAlert("Failed to load payments", "danger");
            }
        };
        load();
    }, [showAlert]);

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (!searchText.trim()) return setPatients([]);

            try {
                const data = await searchPatients(searchText);
                setPatients(data);
            } catch {}
        }, 300);

        return () => clearTimeout(delay);
    }, [searchText]);

    useEffect(() => {
        const t = services.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
        setTotal(t);
        let dv = 0;
        if (discount > 0) {
            dv = isPercent ? (t * discount) / 100 : discount;
        }
        if (dv > t) dv = t;
        setFinalAmount(t - dv);
    }, [services, serviceAmounts, discount, isPercent]);

    const selectPatient = (p) => {
        setSelectedPatient(p);
        setSearchText("");
        setPatients([]);
    };
    const changeServiceAmount = (id, value) =>
        setServiceAmounts((prev) => ({ ...prev, [id]: Number(value) }));
    // eslint-disable-next-line
    const resetForm = () => {
        setSelectedPatient(null);
        setServices([]);
        setServiceAmounts({});
        setDiscount(0);
        setIsPercent(false);
        setSelectedPaymentId("");
        setAppointmentDate(new Date().toISOString().slice(0, 10));
    };

    useEffect(() => {
        if (!manualOverride) setCollected(finalAmount);
    }, [manualOverride, finalAmount]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (!selectedPatient) {
            showAlert("Please select a patient", "warning");
            return;
        }

        if (services.length === 0) {
            showAlert("Select at least one service", "warning");
            return;
        }

        if (!selectedPayment) {
            showAlert("Select Payment Method", "warning");
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();

            formData.append("patientId", selectedPatient._id);
            formData.append("amount", finalAmount);
            formData.append("collected", collected);
            formData.append("remaining", remaining);
            formData.append("status", status);
            formData.append("date", appointmentDate);
            formData.append("time", selectedSlot);
            formData.append("discount", discount);
            formData.append("isPercent", isPercent);

            formData.append(
                "services",
                JSON.stringify(
                    services.map((s) => ({
                        id: s._id,
                        name: s.name,
                        amount: serviceAmounts[s._id] ?? s.amount,
                    })),
                ),
            );

            if (selectedPayment) {
                formData.append("paymentMethodId", selectedPayment.id);
            }

            if (image) {
                formData.append("image", image);
            }

            await addAppointment(formData);
            setShowSuccess(true);
            resetForm();
        } catch (err) {
            showAlert("Server error", "danger");
        } finally {
            setIsSubmitting(false);
        }
    };

    const statusColor =
        status === "Paid"
            ? "#4ade80"
            : status === "Partial"
              ? "#fb923c"
              : "#f87171";
    const dateLabel = (d) =>
        !d
            ? "Select date"
            : new Date(d).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
              });
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // validation
        if (!file.type.startsWith("image/")) {
            showAlert("Only images allowed", "warning");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showAlert("Max 2MB allowed", "warning");
            return;
        }

        setImage(file);
    };

    return (
        <>
            <div className="aa-root">
                <SuccessOverlay
                    visible={showSuccess}
                    onDone={() => {
                        setShowSuccess(false);
                        showAlert("Appointment added successfully", "success");
                    }}
                    title="Appointment Saved"
                    sub="Record created"
                    variant="green"
                    duration={1800}
                />
                <div className="aa-header">
                    <div className="aa-header-icon">
                        <Plus size={16} />
                    </div>
                    <div className="aa-title">
                        Add <em>Appointment</em>
                    </div>
                </div>

                <div className="aa-body">
                    <div className="aa-section">
                        <div className="aa-section-line" />
                        <span className="aa-section-title">Patient</span>
                        <div className="aa-section-line" />
                    </div>

                    <div className="aa-mb">
                        <label htmlFor="nameorphone" className="aa-label">
                            Search Patient
                        </label>
                        <div className="aa-search-wrap">
                            <span className="aa-search-icon">
                                <Search size={14} />
                            </span>
                            <input
                                id="nameorphone"
                                className="aa-input aa-search-input"
                                placeholder="Name or phone number"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                        {patients.length > 0 && (
                            <div className="aa-results">
                                {patients.map((p) => (
                                    <div
                                        key={p._id}
                                        className="aa-result-item"
                                        onClick={() => selectPatient(p)}
                                    >
                                        <User size={13} />
                                        <span className="aa-result-name">
                                            {p.name}
                                        </span>
                                        <span className="aa-result-sep">—</span>
                                        <span>{p.number}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedPatient && (
                            <div className="aa-selected-patient">
                                <div className="aa-selected-avatar">
                                    {selectedPatient.name
                                        ?.charAt(0)
                                        ?.toUpperCase()}
                                </div>
                                <span>{selectedPatient.name}</span>
                                <CheckCircle
                                    size={14}
                                    style={{
                                        marginLeft: "auto",
                                        color: "#4ade80",
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {selectedPatient && (
                        <form onSubmit={handleSubmit}>
                            <div className="aa-section">
                                <div className="aa-section-line" />
                                <span className="aa-section-title">
                                    Schedule
                                </span>
                                <div className="aa-section-line" />
                            </div>

                            {/* Date toggle */}
                            <div className="aa-mb">
                                <label className="aa-label">
                                    <CalendarDays
                                        size={11}
                                        style={{
                                            display: "inline",
                                            marginRight: 5,
                                        }}
                                    />
                                    Appointment Date
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <button
                                    type="button"
                                    className={`aa-date-btn ${showCalendar ? "open" : ""}`}
                                    onClick={() => setShowCalendar((p) => !p)}
                                >
                                    <span
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 7,
                                        }}
                                    >
                                        <CalendarDays
                                            size={13}
                                            style={{ color: "#3a4a6b" }}
                                        />
                                        {dateLabel(appointmentDate)}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            color: "#2e3d5c",
                                        }}
                                    >
                                        {showCalendar ? "▲" : "▼"}
                                    </span>
                                </button>
                                {showCalendar && (
                                    <div className="aa-cal-drop">
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

                            <SlotPicker
                                groupedSlots={groupedSlots}
                                selectedSlot={selectedSlot}
                                setSelectedSlot={setSelectedSlot}
                                bookedSlots={bookedSlots}
                                openSection={openSection}
                                setOpenSection={setOpenSection}
                                currentSlot={currentSlot}
                                nextSlot={nextSlot}
                            />

                            <div className="aa-section">
                                <div className="aa-section-line" />
                                <span className="aa-section-title">
                                    Services
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </span>
                                <div className="aa-section-line" />
                            </div>

                            <div className="aa-mb">
                                <ServiceList
                                    services={allServices}
                                    selectedServices={services}
                                    currency={currency}
                                    onAdd={handleAddService}
                                    onRemove={handleRemoveService}
                                />
                            </div>

                            {services.length > 0 && (
                                <>
                                    <div className="aa-section">
                                        <div className="aa-section-line" />
                                        <span className="aa-section-title">
                                            Billing
                                        </span>
                                        <div className="aa-section-line" />
                                    </div>
                                    <div className="aa-mb">
                                        {services.map((s) => (
                                            <div
                                                key={s._id}
                                                className="aa-service-row"
                                            >
                                                <span className="aa-service-row-name">
                                                    {s.name}
                                                </span>
                                                <input
                                                    type="number"
                                                    className="aa-amount-input"
                                                    value={
                                                        serviceAmounts[s._id] ??
                                                        s.amount
                                                    }
                                                    onChange={(e) =>
                                                        changeServiceAmount(
                                                            s._id,
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="aa-discount-row aa-mb">
                                        <label className="aa-label">
                                            Discount
                                        </label>
                                        <input
                                            type="number"
                                            className="aa-input"
                                            placeholder="0"
                                            value={discount}
                                            onChange={(e) =>
                                                setDiscount(
                                                    Number(e.target.value),
                                                )
                                            }
                                            style={{ flex: 1 }}
                                        />
                                        <label
                                            className={`aa-percent-toggle ${isPercent ? "on" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isPercent}
                                                onChange={(e) =>
                                                    setIsPercent(
                                                        e.target.checked,
                                                    )
                                                }
                                            />{" "}
                                            % Percent
                                        </label>
                                    </div>
                                    <div className="aa-summary">
                                        <div className="aa-summary-row">
                                            <span>Total</span>
                                            <span className="aa-summary-val">
                                                {currency?.symbol}
                                                {fmt(total)}
                                            </span>
                                        </div>
                                        {discountValue > 0 && (
                                            <div className="aa-summary-row">
                                                <span>Discount</span>
                                                <span
                                                    className="aa-summary-val"
                                                    style={{ color: "#fb923c" }}
                                                >
                                                    - {currency?.symbol}
                                                    {fmt(discountValue)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="aa-summary-row final">
                                            <span>Final Amount</span>
                                            <span className="aa-summary-val">
                                                {currency?.symbol}
                                                {fmt(finalAmount)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="aa-mb">
                                        <label className="aa-label">
                                            Amount Collected
                                        </label>
                                        <input
                                            type="number"
                                            className="aa-input"
                                            value={collected}
                                            min={0}
                                            max={finalAmount}
                                            onChange={(e) => {
                                                setManualOverride(true);
                                                setCollected(
                                                    Number(e.target.value),
                                                );
                                            }}
                                        />
                                    </div>
                                    <div className="aa-status-row">
                                        <span>
                                            Remaining {currency?.symbol}
                                            {fmt(remaining)}
                                        </span>
                                        <span
                                            className="aa-status-badge"
                                            style={{
                                                background: `${statusColor}18`,
                                                border: `1px solid ${statusColor}40`,
                                                color: statusColor,
                                            }}
                                        >
                                            {status}
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="aa-section">
                                <div className="aa-section-line" />
                                <span className="aa-section-title">
                                    Payment
                                </span>
                                <div className="aa-section-line" />
                            </div>
                            <div className="aa-mb">
                                <label htmlFor="payment" className="aa-label">
                                    <CreditCard
                                        size={11}
                                        style={{
                                            display: "inline",
                                            marginRight: 5,
                                        }}
                                    />
                                    Payment Type
                                    <span className="sg-required">
                                        <sup>*</sup>
                                    </span>
                                </label>
                                <select
                                    className="aa-select"
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

                            <div className="aa-mb">
                                <label className="aa-label">
                                    Upload Image
                                    <span
                                        style={{
                                            color: "#2e3d5c",
                                            fontWeight: 400,
                                            marginLeft: 6,
                                            fontSize: 9,
                                        }}
                                    >
                                        — max 2 MB
                                    </span>
                                </label>
                                <span
                                    style={{
                                        fontSize: 10,
                                        color: "#6b7fa8",
                                        marginLeft: 8,
                                    }}
                                >
                                    ({usage?.images?.used || 0}/
                                    {usage?.images?.limit === -1
                                        ? "∞"
                                        : usage?.images?.limit}
                                    )
                                </span>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    disabled={isImageLimitReached}
                                    onChange={(e) => {
                                        if (isImageLimitReached) {
                                            showAlert(
                                                "Image limit reached 🚫",
                                                "warning",
                                            );
                                            return;
                                        }
                                        handleImageChange(e);
                                    }}
                                />

                                <div className="aa-upload-btns">
                                    <button
                                        type="button"
                                        className="aa-upload-btn"
                                        disabled={isImageLimitReached}
                                        style={{
                                            opacity: isImageLimitReached
                                                ? 0.5
                                                : 1,
                                            cursor: isImageLimitReached
                                                ? "not-allowed"
                                                : "pointer",
                                        }}
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
                                        <span className="aa-upload-btn-icon">
                                            ↑
                                        </span>{" "}
                                        Upload File
                                    </button>
                                </div>

                                {image && (
                                    <div className="aa-upload-preview">
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt="preview"
                                            className="aa-preview-img"
                                        />
                                        <div className="aa-preview-info">
                                            <div className="aa-preview-name">
                                                {image.name}
                                            </div>
                                            <div className="aa-preview-size">
                                                {(image.size / 1024).toFixed(0)}{" "}
                                                KB
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="aa-preview-remove"
                                            onClick={() => setImage(null)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                className="aa-submit"
                                disabled={isSubmitting || services.length === 0}
                            >
                                <CheckCircle size={14} />
                                {isSubmitting
                                    ? "Saving..."
                                    : "Save Appointment"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
}
