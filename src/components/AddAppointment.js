import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ServiceList from "./ServiceList";
import {
    Plus,
    Search,
    User,
    CalendarDays,
    CreditCard,
    CheckCircle,
    ImageIcon,
} from "lucide-react";
import SlotPicker from "./Slotpicker";
import { DayPicker } from "react-day-picker";
import { fetchPaymentMethods } from "../api/payment.api";
import { addAppointment } from "../api/appointment.api";
import { useSlots } from "../hooks/useSlots";
import { fetchAvailability } from "../api/availability.api";
import { fetchServices } from "../api/service.api";
import { searchPatients } from "../api/patientSearch.api";
// import SuccessOverlay from "./SuccessOverlay";
import { getTodayLocal } from "./utils/dateutils";
import "../css/Addappointment.css";

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
];
const MAX_IMAGES = 10;

export default function AddAppointment({
    showAlert,
    currency,
    usage,
    country,
    onAppointmentAdded,
    closePanel,
}) {
    // Derive display locale from the doctor's country code ("IN" → "en-IN").
    // Falls back to the browser's locale when country hasn't loaded yet.
    const locale = country?.code ? `en-${country.code}` : undefined;

    const [searchText, setSearchText] = useState("");
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [collected, setCollected] = useState(0);
    const [allServices, setAllServices] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [appointmentDate, setAppointmentDate] = useState(getTodayLocal());
    const [paymentOptions, setPaymentOptions] = useState([]);
    const [selectedPaymentId, setSelectedPaymentId] = useState("");
    const [manualOverride, setManualOverride] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [availability, setAvailability] = useState([]);
    // eslint-disable-next-line
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [openSection, setOpenSection] = useState("Morning");
    const [showCalendar, setShowCalendar] = useState(false);

    // ── Multi-image state ───────────────────────────────────────────────────
    // Each item: { file: File, preview: string }
    const [imageFiles, setImageFiles] = useState([]);

    const [total, setTotal] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);
    const isZeroAmountAppointment = services.length > 0 && finalAmount <= 0;

    const fileInputRef = useRef(null);
    const fmt = (v) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v);
    const discountValue = Math.min(
        isPercent ? (total * discount) / 100 : discount,
        total,
    );

    const {
        timeSlots = [],
        bookedSlots = [],
        groupedSlots = {},
        bookedSlotsReady = false,
        refetchBookedSlots = () => {},
    } = useSlots(availability, appointmentDate, true) || {};

    const selectedPayment = paymentOptions.find(
        (p) => String(p.id) === String(selectedPaymentId),
    );

    const isImageLimitReached = usage?.images?.isLimitReached;
    const subscriptionExpired = usage?.subscriptionExpired === true;
    const imagesUsed = usage?.images?.used || 0;
    const imagesLimit = usage?.images?.limit ?? 0;
    const localUsed = imagesUsed + imageFiles.length;
    const isLocalLimitReached =
        subscriptionExpired ||
        isImageLimitReached ||
        (imagesLimit !== -1 && localUsed >= imagesLimit);

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

    const hasAutoSelected = useRef(false);
    useEffect(() => {
        if (bookedSlotsReady && currentSlot && !hasAutoSelected.current) {
            setSelectedSlot(currentSlot);
            hasAutoSelected.current = true;
        }
    }, [currentSlot, bookedSlotsReady]);

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

    useEffect(() => {
        setDiscount((prev) => {
            let value = Number(prev) || 0;
            if (value < 0) value = 0;
            if (isPercent) {
                return Math.min(value, 100);
            }
            return Math.min(value, total);
        });
    }, [total, isPercent]);

    const selectPatient = (p) => {
        setSelectedPatient(p);
        setSearchText("");
        setPatients([]);
        hasAutoSelected.current = false;
    };
    const changeServiceAmount = (id, value) =>
        setServiceAmounts((prev) => ({ ...prev, [id]: Number(value) }));

    const resetForm = () => {
        setSelectedPatient(null);
        setServices([]);
        setServiceAmounts({});
        setDiscount(0);
        setIsPercent(false);
        setSelectedPaymentId("");
        setAppointmentDate(new Date().toISOString().slice(0, 10));
        setImageFiles([]);
        setManualOverride(false);
    };

    useEffect(() => {
        if (!manualOverride) setCollected(finalAmount);
    }, [manualOverride, finalAmount]);

    // ── Image handlers ──────────────────────────────────────────────────────

    const handleImageChange = (e) => {
        const newFiles = Array.from(e.target.files || []);
        if (!newFiles.length) return;

        if (subscriptionExpired) {
            showAlert(
                "Your subscription has expired. Renew to upload files.",
                "warning",
            );
            e.target.value = "";
            return;
        }
        if (isImageLimitReached) {
            showAlert(`Image limit reached. Upgrade plan.`, "warning");
            e.target.value = "";
            return;
        }

        const errors = [];
        const valid = [];

        for (const file of newFiles) {
            const isPDF = file.type === "application/pdf";

            if (!ALLOWED_TYPES.includes(file.type)) {
                errors.push(`${file.name}: only images or PDFs allowed`);
                continue;
            }

            const maxSize = isPDF
                ? 2 * 1024 * 1024 // keep this
                : 2 * 1024 * 1024;

            if (file.size > maxSize) {
                errors.push(
                    `${file.name}: exceeds ${isPDF ? "2MB (PDF)" : "2MB (image)"}`,
                );
                continue;
            }

            valid.push(file);
        }

        if (errors.length) showAlert(errors.join("; "), "warning");

        if (!valid.length) return;

        // Check slots
        const slotsLeft =
            imagesLimit === -1
                ? MAX_IMAGES - imageFiles.length
                : Math.min(
                      imagesLimit - imagesUsed - imageFiles.length,
                      MAX_IMAGES - imageFiles.length,
                  );

        if (valid.length > slotsLeft) {
            showAlert(
                `Only ${slotsLeft} more image(s) allowed on your plan`,
                "warning",
            );
            valid.splice(slotsLeft);
        }

        const toAdd = valid.map((file) => ({
            file,
            preview: file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : null,
        }));

        setImageFiles((prev) => [...prev, ...toAdd]);

        // Reset input so the same file can be picked again
        e.target.value = "";
    };

    const handleRemoveImage = (index) => {
        setImageFiles((prev) => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

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
        if (finalAmount <= 0) {
            const confirmed = window.confirm(
                `This appointment has ${currency?.symbol || ""}0 billing. Continue?`,
            );

            if (!confirmed) {
                return;
            }
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
            if (selectedPayment)
                formData.append("paymentMethodId", selectedPayment.id);

            // Append all images under the "images" key
            for (const { file } of imageFiles) {
                formData.append("images", file);
            }

            await addAppointment(formData);
            refetchBookedSlots();
            showAlert(`Appointment Added`, "success");
            resetForm();
            if (onAppointmentAdded) onAppointmentAdded();
            if (closePanel) setTimeout(closePanel, 800);
        } catch (err) {
            showAlert(err.message || "Server error", "danger");
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
            : new Date(d + "T00:00:00").toLocaleDateString(locale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
              });

    return (
        <>
            <div className="aa-root">
                {/* <SuccessOverlay
                    visible={showSuccess}
                    onDone={() => {
                        setShowSuccess(false);
                        showAlert("Appointment added successfully", "success");
                    }}
                    title="Appointment Saved"
                    sub="Record created"
                    variant="green"
                    duration={1800}
                /> */}
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
                            {/* ── Schedule ── */}
                            <div className="aa-section">
                                <div className="aa-section-line" />
                                <span className="aa-section-title">
                                    Schedule
                                </span>
                                <div className="aa-section-line" />
                            </div>

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
                                                    ? new Date(
                                                          appointmentDate +
                                                              "T00:00:00",
                                                      )
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

                            {/* ── Billing ── */}
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
                                            min={0}
                                            max={isPercent ? 100 : total}
                                            placeholder="0"
                                            value={discount}
                                            onChange={(e) => {
                                                let value =
                                                    Number(e.target.value) || 0;
                                                if (value < 0) value = 0;
                                                if (isPercent) {
                                                    value = Math.min(
                                                        value,
                                                        100,
                                                    );
                                                } else {
                                                    value = Math.min(
                                                        value,
                                                        total,
                                                    );
                                                }
                                                setDiscount(value);
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <label
                                            className={`aa-percent-toggle ${isPercent ? "on" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isPercent}
                                                onChange={(e) => {
                                                    const checked =
                                                        e.target.checked;
                                                    setIsPercent(checked);
                                                    setDiscount((prev) => {
                                                        let value =
                                                            Number(prev) || 0;
                                                        if (checked) {
                                                            return Math.min(
                                                                value,
                                                                100,
                                                            );
                                                        }
                                                        return Math.min(
                                                            value,
                                                            total,
                                                        );
                                                    });
                                                }}
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
                                        {isZeroAmountAppointment && (
                                            <div className="aa-zero-warning">
                                                ⚠️ This appointment will be
                                                saved with {currency.symbol}0
                                                billing.
                                            </div>
                                        )}
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

                            {/* ── Payment ── */}
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

                            {/* ── Images ── */}
                            <div className="aa-section">
                                <div className="aa-section-line" />
                                <span className="aa-section-title">Images</span>
                                <div className="aa-section-line" />
                            </div>
                            <div className="aa-mb">
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <label
                                        className="aa-label"
                                        style={{ margin: 0 }}
                                    >
                                        <ImageIcon
                                            size={11}
                                            style={{
                                                display: "inline",
                                                marginRight: 5,
                                            }}
                                        />
                                        Upload Images / PDF
                                        <span
                                            style={{
                                                color: "#2e3d5c",
                                                fontWeight: 400,
                                                marginLeft: 6,
                                                fontSize: 9,
                                            }}
                                        >
                                            — max 2MB
                                        </span>
                                    </label>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color: isLocalLimitReached
                                                    ? "#f87171"
                                                    : "#6b7fa8",
                                            }}
                                        >
                                            {imagesLimit === -1
                                                ? `${localUsed}/∞`
                                                : `${localUsed}/${imagesLimit}`}{" "}
                                            used
                                        </span>
                                        {subscriptionExpired && (
                                            <span
                                                style={{
                                                    fontSize: 9,
                                                    background: "#f871711a",
                                                    border: "1px solid #f8717140",
                                                    color: "#f87171",
                                                    borderRadius: 4,
                                                    padding: "1px 5px",
                                                }}
                                            >
                                                Expired
                                            </span>
                                        )}
                                        {!subscriptionExpired &&
                                            isLocalLimitReached && (
                                                <span
                                                    style={{
                                                        fontSize: 9,
                                                        background: "#f871711a",
                                                        border: "1px solid #f8717140",
                                                        color: "#f87171",
                                                        borderRadius: 4,
                                                        padding: "1px 5px",
                                                    }}
                                                >
                                                    Limit Reached
                                                </span>
                                            )}
                                    </div>
                                </div>

                                {/* Hidden file input */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,application/pdf"
                                    multiple
                                    style={{ display: "none" }}
                                    onChange={handleImageChange}
                                />

                                {/* Add button */}
                                <button
                                    type="button"
                                    className="aa-upload-btn"
                                    onClick={() => {
                                        if (subscriptionExpired) {
                                            showAlert(
                                                "Your subscription has expired. Renew to upload files.",
                                                "warning",
                                            );
                                            return;
                                        }
                                        if (isLocalLimitReached) {
                                            showAlert(
                                                `Image upload limit reached (${localUsed}/${imagesLimit === -1 ? "∞" : imagesLimit}). Upgrade your plan to upload more.`,
                                                "warning",
                                            );
                                            return;
                                        }
                                        fileInputRef.current?.click();
                                    }}
                                >
                                    <span className="aa-upload-btn-icon">
                                        +
                                    </span>{" "}
                                    Attach Files
                                    {imageFiles.length > 0 && (
                                        <span
                                            style={{
                                                marginLeft: 6,
                                                fontSize: 9,
                                                color: "#60a5fa",
                                            }}
                                        >
                                            ({imageFiles.length} selected)
                                        </span>
                                    )}
                                </button>

                                {/* Preview grid */}
                                {imageFiles.length > 0 && (
                                    <div className="aa-images-grid">
                                        {imageFiles.map(
                                            ({ file, preview }, idx) => (
                                                <div
                                                    className="aa-preview-card"
                                                    key={idx}
                                                >
                                                    {/* Image OR PDF */}
                                                    {file.type ===
                                                    "application/pdf" ? (
                                                        <div className="aa-pdf-preview">
                                                            📄
                                                            <span className="aa-preview-name">
                                                                {file.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={preview}
                                                            alt={file.name}
                                                            className="aa-preview-img"
                                                        />
                                                    )}

                                                    {/* Overlay */}
                                                    <div className="aa-preview-overlay">
                                                        <span className="aa-preview-name">
                                                            {file.name}
                                                        </span>
                                                    </div>

                                                    {/* Remove */}
                                                    <button
                                                        type="button"
                                                        className="aa-preview-remove"
                                                        onClick={() =>
                                                            handleRemoveImage(
                                                                idx,
                                                            )
                                                        }
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ),
                                        )}
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
