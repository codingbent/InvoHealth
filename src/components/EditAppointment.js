import { useEffect, useState, useCallback, useMemo } from "react";
import { authFetch } from "./authfetch";
import { DayPicker } from "react-day-picker";
import { X, Check, CalendarDays } from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchPaymentMethods } from "../api/payment.api";
import ServiceList from "./ServiceList";

const EditAppointment = ({
    showAlert,
    currency,
    appointmentId,
    visit,
    availableServices = [],
    onClose,
    onSaved,
}) => {
    // ─── Slot / calendar state ───────────────────────────────────────────────
    const [availability, setAvailability] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [openSection, setOpenSection] = useState("Morning");
    const [showCalendar, setShowCalendar] = useState(false);

    // ─── Form state ───────────────────────────────────────────────────────────
    const [apptData, setApptData] = useState({
        date: "",
        time: "",
        service: [],
        paymentMethodId: "",
        categoryName: "",
    });
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [finalAmount, setFinalAmount] = useState(0);
    const [collected, setCollected] = useState(0);
    const [isFullPaid, setIsFullPaid] = useState(false);
    const [initialCollected, setInitialCollected] = useState(0);

    // ─── Image state ──────────────────────────────────────────────────────────
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState("");
    const [lightboxImg, setLightboxImg] = useState(null);

    // ─── Payment options ──────────────────────────────────────────────────────
    const [paymentOptions, setPaymentOptions] = useState([]);

    // ─── Saving flag ──────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);

    const fmt = (v) =>
        new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
            v,
        );

    const formatTime = (time) => {
        if (!time) return "";
        const [h, m] = time.split(":");
        let hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    const dateLabel = (d) =>
        !d
            ? "Select date"
            : new Date(d).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
              });

    const generateSlots = useCallback((start, end, duration) => {
        const step = duration || 15;
        const slots = [];
        let [h, m] = start.split(":").map(Number);
        let [endH, endM] = end.split(":").map(Number);
        const current = new Date();
        current.setHours(h, m, 0, 0);
        const endTime = new Date();
        endTime.setHours(endH, endM, 0, 0);
        while (current < endTime) {
            slots.push(current.toTimeString().slice(0, 5));
            current.setMinutes(current.getMinutes() + step);
        }
        return slots;
    }, []);

    const selectedPayment = paymentOptions.find(
        (p) => String(p.id) === String(apptData.paymentMethodId),
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Data fetches
    // ─────────────────────────────────────────────────────────────────────────

    // Fetch doctor availability (needed for slot generation)
    useEffect(() => {
        const fetchAvail = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/timing/get_availability`,
                );
                const data = await res.json();
                if (data.success) setAvailability(data.availability || []);
            } catch (err) {
                console.error("availability fetch error:", err);
            }
        };
        fetchAvail();
    }, []);

    // Fetch payment methods
    useEffect(() => {
        const load = async () => {
            try {
                const methods = await fetchPaymentMethods();
                setPaymentOptions(methods);
            } catch (err) {
                console.error("payment methods fetch error:", err);
            }
        };
        load();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // Populate form from the visit prop on mount
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!visit) return;

        const normalizedServices = (visit.service || []).map((s) => {
            const rs = availableServices.find(
                (as) => String(as._id) === String(s._id || s.id),
            );
            return {
                _id: String(rs?._id || s._id || s.id),
                name: s.name,
                amount: s.amount ?? rs?.amount ?? 0,
            };
        });

        const date = visit.date?.slice(0, 10) || "";

        setApptData({
            date,
            time: visit.time || "",
            service: normalizedServices,
            paymentMethodId: visit.paymentMethodId || "",
            categoryName: visit.categoryName || "",
        });

        const amountMap = {};
        normalizedServices.forEach((s) => {
            amountMap[String(s._id)] = s.amount || 0;
        });
        setServiceAmounts(amountMap);
        setDiscount(visit.discount || 0);
        setIsPercent(!!visit.isPercent);
        setInitialCollected(visit.collected || 0);
        setImagePreview(visit.image || "");
        setImageFile(null);
    }, [visit, availableServices]);

    // ─────────────────────────────────────────────────────────────────────────
    // Slot fetching
    // ─────────────────────────────────────────────────────────────────────────
    const fetchSlotsForDate = useCallback(
        async (date, isEdit = false) => {
            if (!date || !availability.length) return;
            try {
                const selectedDay = new Date(date)
                    .toLocaleDateString("en-US", { weekday: "short" })
                    .slice(0, 3);
                const dayData = availability.find((d) => d.day === selectedDay);
                if (!dayData) {
                    setTimeSlots([]);
                    return;
                }
                let allSlots = [];
                dayData.slots.forEach((slot) => {
                    allSlots = [
                        ...allSlots,
                        ...generateSlots(
                            slot.startTime,
                            slot.endTime,
                            slot.slotDuration,
                        ),
                    ];
                });

                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/appointment/booked_slots?date=${date}`,
                );
                const data = await res.json();
                const booked = data.slots || [];
                setBookedSlots(booked);

                // In edit mode, show all slots (including the one already booked
                // for this visit) so the user can change or keep it.
                if (isEdit) {
                    setTimeSlots(allSlots);
                    return;
                }

                // For new appointments, strip past slots if today.
                const today = new Date();
                const isToday =
                    new Date(date).toDateString() === today.toDateString();
                if (isToday) {
                    const ct = today.getHours() * 60 + today.getMinutes();
                    allSlots = allSlots.filter((t) => {
                        const [h, m] = t.split(":").map(Number);
                        return h * 60 + m > ct;
                    });
                }
                setTimeSlots(allSlots.filter((s) => !booked.includes(s)));
            } catch (err) {
                console.error("slot fetch error:", err);
            }
        },
        [availability, generateSlots],
    );

    // Re-fetch slots whenever date or availability changes.
    // Pass isEdit=true so the currently-booked slot stays visible.
    useEffect(() => {
        if (!apptData.date || !availability.length) return;
        fetchSlotsForDate(apptData.date, true);
    }, [apptData.date, availability, fetchSlotsForDate]);

    // Auto-open the accordion section that contains the selected time
    useEffect(() => {
        if (!apptData.time) return;
        const hour = parseInt(apptData.time.split(":")[0]);
        if (hour < 12) setOpenSection("Morning");
        else if (hour < 16) setOpenSection("Afternoon");
        else setOpenSection("Evening");
    }, [apptData.time]);

    // ─────────────────────────────────────────────────────────────────────────
    // finalAmount calculation
    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const total = apptData.service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
        let dv = 0;
        if (discount > 0) {
            dv = isPercent ? total * (discount / 100) : discount;
        }
        dv = Math.max(0, Math.min(dv, total));
        setFinalAmount(Math.round((total - dv) * 100) / 100);
    }, [apptData.service, serviceAmounts, discount, isPercent]);

    // Sync collected to initialCollected once finalAmount is ready
    useEffect(() => {
        if (finalAmount > 0) {
            setCollected(initialCollected);
        }
    }, [finalAmount, initialCollected]);

    // Clamp collected so it never exceeds finalAmount
    useEffect(() => {
        setCollected((prev) => (prev > finalAmount ? finalAmount : prev));
    }, [finalAmount]);

    // When "full paid" checkbox is toggled, sync collected
    useEffect(() => {
        if (isFullPaid) setCollected(finalAmount);
    }, [isFullPaid, finalAmount]);

    // ─────────────────────────────────────────────────────────────────────────
    // Slot helpers
    // ─────────────────────────────────────────────────────────────────────────
    const allSlotsWithSelected = useMemo(() => {
        if (!apptData.time) return timeSlots;
        if (!timeSlots.includes(apptData.time))
            return [apptData.time, ...timeSlots];
        return timeSlots;
    }, [timeSlots, apptData.time]);

    const groupedSlots = useMemo(() => {
        const groups = { Morning: [], Afternoon: [], Evening: [] };
        allSlotsWithSelected.forEach((slot) => {
            const hour = parseInt(slot.split(":")[0]);
            if (hour < 12) groups.Morning.push(slot);
            else if (hour < 16) groups.Afternoon.push(slot);
            else groups.Evening.push(slot);
        });
        return groups;
    }, [allSlotsWithSelected]);

    const serviceTotal = useMemo(
        () =>
            apptData.service.reduce(
                (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
                0,
            ),
        [apptData.service, serviceAmounts],
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────
    const validateForm = () => {
        if (!apptData.date) return "Please select a date";
        if (timeSlots.length > 0 && !apptData.time)
            return "Please select a time slot";
        if (!apptData.service.length) return "Please add at least one service";
        if (!apptData.paymentMethodId) return "Please select payment type";
        return "";
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Submit
    // ─────────────────────────────────────────────────────────────────────────
    const handleUpdateAppt = async () => {
        const error = validateForm();
        if (error) {
            showAlert(error, "warning");
            return;
        }

        setSaving(true);
        try {
            // Upload image first if a new file was selected
            let imageUrl = imageFile ? null : visit?.image || null;
            if (imageFile) {
                const formData = new FormData();
                formData.append("image", imageFile);
                // Use authFetch so the upload is authenticated
                const uploadRes = await authFetch(
                    `${API_BASE_URL}/api/doctor/image/upload`,
                    { method: "POST", body: formData },
                );
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) {
                    showAlert("Image upload failed", "danger");
                    return;
                }
                imageUrl = uploadData.url;
            }

            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/edit_appointment/${appointmentId}/${visit._id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        date: apptData.date,
                        time: apptData.time,
                        service: apptData.service.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        paymentMethodId: selectedPayment?.id || null,
                        categoryName: selectedPayment?.categoryName || null,
                        discount,
                        isPercent,
                        collected,
                        image: imageUrl,
                    }),
                },
            );

            const data = await response.json();
            if (data.success) {
                showAlert("Appointment updated successfully!", "success");
                onSaved?.(); // let the parent refetch — no full-page reload
                onClose?.();
            } else {
                showAlert(data.message || "Update failed", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Server error. Please try again.", "danger");
        } finally {
            setSaving(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Modal backdrop */}
            <div
                className="pd-modal-bg"
                onClick={() => {
                    setShowCalendar(false);
                    onClose?.();
                }}
            >
                <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="pd-modal-header">
                        <div className="pd-modal-title">
                            Edit <em>Appointment</em>
                        </div>
                        <button
                            className="pd-modal-close"
                            onClick={() => {
                                setShowCalendar(false);
                                onClose?.();
                            }}
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="pd-modal-body">
                        {/* ── Date picker ── */}
                        <div className="pd-field">
                            <label className="pd-label">
                                Date &amp; Time
                                <span className="sg-required">
                                    <sup>*</sup>
                                </span>
                            </label>
                            <button
                                type="button"
                                className={`pd-date-btn ${showCalendar ? "open" : ""}`}
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
                                    {dateLabel(apptData.date)}
                                </span>
                                <span
                                    style={{ fontSize: 10, color: "#2e3d5c" }}
                                >
                                    {showCalendar ? "▲" : "▼"}
                                </span>
                            </button>

                            {showCalendar && (
                                <div className="pd-cal-drop">
                                    <DayPicker
                                        mode="single"
                                        selected={
                                            apptData.date
                                                ? new Date(apptData.date)
                                                : undefined
                                        }
                                        onSelect={(date) => {
                                            if (!date) return;
                                            setApptData((prev) => ({
                                                ...prev,
                                                date: date.toLocaleDateString(
                                                    "en-CA",
                                                ),
                                                time: "",
                                            }));
                                            setShowCalendar(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Current selected time label */}
                        <div className="pd-current-slot">
                            {apptData.time
                                ? formatTime(apptData.time)
                                : "No time selected"}
                        </div>

                        {/* ── Time slots ── */}
                        {Object.entries(groupedSlots).map(([label, slots]) =>
                            slots.length ? (
                                <div key={label} className="pd-slot-accordion">
                                    <div
                                        className={`pd-slot-hdr ${openSection === label ? "open" : ""}`}
                                        onClick={() =>
                                            setOpenSection((p) =>
                                                p === label ? null : label,
                                            )
                                        }
                                    >
                                        <span>{label}</span>
                                        <span style={{ fontSize: 14 }}>
                                            {openSection === label ? "−" : "+"}
                                        </span>
                                    </div>
                                    {openSection === label && (
                                        <div className="pd-slot-grid">
                                            {slots
                                                .filter(
                                                    (slot) =>
                                                        !bookedSlots.includes(
                                                            slot,
                                                        ) ||
                                                        apptData.time === slot,
                                                )
                                                .map((slot) => (
                                                    <button
                                                        key={slot}
                                                        type="button"
                                                        disabled={
                                                            bookedSlots.includes(
                                                                slot,
                                                            ) &&
                                                            apptData.time !==
                                                                slot
                                                        }
                                                        className={`pd-slot${apptData.time === slot ? " selected" : ""}${bookedSlots.includes(slot) ? " booked" : ""}`}
                                                        onClick={() =>
                                                            setApptData(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    time: slot,
                                                                }),
                                                            )
                                                        }
                                                    >
                                                        {formatTime(slot)}
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            ) : null,
                        )}

                        {/* ── Services ── */}
                        <div className="pd-section-sep">
                            Services &amp; Billing
                            <span className="sg-required">
                                <sup>*</sup>
                            </span>
                        </div>
                        <ServiceList
                            services={availableServices}
                            selectedServices={apptData.service}
                            currency={currency}
                            onAdd={(s) =>
                                setApptData((prev) =>
                                    prev.service.some((x) => x._id === s._id)
                                        ? prev
                                        : {
                                              ...prev,
                                              service: [...prev.service, s],
                                          },
                                )
                            }
                            onRemove={(removeId) =>
                                setApptData((prev) => ({
                                    ...prev,
                                    service: prev.service.filter(
                                        (s) => s._id !== removeId,
                                    ),
                                }))
                            }
                        />

                        {apptData.service.length > 0 && (
                            <>
                                <div style={{ marginTop: 10 }}>
                                    {apptData.service.map((s) => (
                                        <div
                                            key={s._id}
                                            className="pd-service-row"
                                        >
                                            <span style={{ color: "#c5d0e8" }}>
                                                {s.name}
                                            </span>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 4,
                                                    color: "#3a4a6b",
                                                }}
                                            >
                                                {currency?.symbol}
                                                <input
                                                    type="number"
                                                    className="pd-amount-input"
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

                                <div className="pd-summary">
                                    <div className="pd-summary-row">
                                        <span>Subtotal</span>
                                        <span
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 3,
                                            }}
                                        >
                                            {currency?.symbol}
                                            {fmt(serviceTotal)}
                                        </span>
                                    </div>
                                    {serviceTotal !== finalAmount && (
                                        <div className="pd-summary-row">
                                            <span>Discount</span>
                                            <span
                                                style={{
                                                    color: "#fb923c",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 3,
                                                }}
                                            >
                                                − {currency?.symbol}
                                                {fmt(
                                                    serviceTotal - finalAmount,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div className="pd-summary-row final">
                                        <span>Final Amount</span>
                                        <span
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 3,
                                            }}
                                        >
                                            {currency?.symbol}
                                            {fmt(finalAmount)}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* ── Discount ── */}
                        <div className="pd-section-sep">Discount</div>
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                                marginBottom: 12,
                            }}
                        >
                            <input
                                type="number"
                                className="pd-input"
                                style={{ margin: 0, flex: 1 }}
                                value={discount}
                                onChange={(e) =>
                                    setDiscount(Number(e.target.value))
                                }
                            />
                            <label
                                className={`pd-percent-toggle${isPercent ? " on" : ""}`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isPercent}
                                    onChange={(e) =>
                                        setIsPercent(e.target.checked)
                                    }
                                />{" "}
                                % Percent
                            </label>
                        </div>

                        {/* ── Collection ── */}
                        <div className="pd-section-sep">Collection</div>
                        <div className="pd-collected-row">
                            <span style={{ color: "#c5d0e8", fontSize: 11 }}>
                                Amount Collected{" "}
                                {isFullPaid && (
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
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    color: "#3a4a6b",
                                }}
                            >
                                {currency?.symbol}
                                <input
                                    type="number"
                                    className="pd-amount-input"
                                    value={collected}
                                    disabled={isFullPaid}
                                    onChange={(e) => {
                                        const v = Number(e.target.value);
                                        setCollected(v);
                                        if (v !== finalAmount)
                                            setIsFullPaid(false);
                                    }}
                                />
                            </div>
                        </div>
                        <label
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 11,
                                color: "#3a4a6b",
                                cursor: "pointer",
                                marginBottom: 12,
                            }}
                        >
                            <input
                                type="checkbox"
                                style={{ accentColor: "#4d7cf6" }}
                                checked={isFullPaid}
                                onChange={(e) =>
                                    setIsFullPaid(e.target.checked)
                                }
                            />
                            Collect full payable amount automatically
                        </label>

                        {finalAmount > 0 &&
                            (() => {
                                const rem = Math.max(
                                    finalAmount - collected,
                                    0,
                                );
                                const s =
                                    rem === 0
                                        ? "Paid"
                                        : collected > 0
                                          ? "Partial"
                                          : "Unpaid";
                                const sc =
                                    s === "Paid"
                                        ? "#4ade80"
                                        : s === "Partial"
                                          ? "#fb923c"
                                          : "#f87171";
                                return (
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 12,
                                            fontSize: 11,
                                        }}
                                    >
                                        <span style={{ color: "#4a5a7a" }}>
                                            Remaining: {currency?.symbol}
                                            {fmt(rem)}
                                        </span>
                                        <span
                                            style={{
                                                padding: "3px 10px",
                                                borderRadius: 20,
                                                fontSize: 9,
                                                letterSpacing: "0.1em",
                                                textTransform: "uppercase",
                                                fontWeight: 600,
                                                background: `${sc}12`,
                                                border: `1px solid ${sc}30`,
                                                color: sc,
                                            }}
                                        >
                                            {s}
                                        </span>
                                    </div>
                                );
                            })()}

                        {/* ── Image upload ── */}
                        <div className="pd-field">
                            <div className="pd-upload-label-row">
                                <label
                                    className="pd-label"
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
                            </div>

                            <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                id="editImageInput"
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
                                            "Max 2 MB allowed",
                                            "warning",
                                        );
                                        return;
                                    }
                                    setImageFile(file);
                                    setImagePreview(URL.createObjectURL(file));
                                }}
                            />

                            {!imagePreview ? (
                                <button
                                    type="button"
                                    className="pd-upload-btn"
                                    onClick={() =>
                                        document
                                            .getElementById("editImageInput")
                                            ?.click()
                                    }
                                >
                                    ↑ Upload Image
                                </button>
                            ) : (
                                <div className="pd-upload-preview">
                                    <img
                                        src={imagePreview}
                                        alt="preview"
                                        className="pd-preview-img"
                                        style={{ cursor: "zoom-in" }}
                                        onClick={() =>
                                            setLightboxImg({
                                                url: imagePreview,
                                                date: "",
                                            })
                                        }
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div className="pd-preview-name">
                                            {imageFile?.name || "Current Image"}
                                        </div>
                                        <div
                                            className="pd-preview-size"
                                            style={{ marginTop: 3 }}
                                        >
                                            {imageFile
                                                ? `${(imageFile.size / 1024).toFixed(0)} KB`
                                                : "Tap to preview"}
                                        </div>
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 6,
                                            alignItems: "flex-end",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            className="pd-upload-remove"
                                            onClick={() => {
                                                setImageFile(null);
                                                setImagePreview("");
                                            }}
                                        >
                                            ✕ Remove
                                        </button>
                                        <button
                                            type="button"
                                            className="pd-upload-btn"
                                            style={{
                                                marginBottom: 0,
                                                padding: "4px 10px",
                                                fontSize: 10,
                                            }}
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        "editImageInput",
                                                    )
                                                    ?.click()
                                            }
                                        >
                                            ↑ Replace
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Payment type ── */}
                        <div className="pd-field">
                            <label className="pd-label">
                                Payment Type
                                <span className="sg-required">
                                    <sup>*</sup>
                                </span>
                            </label>
                            <select
                                className="pd-select"
                                value={apptData.paymentMethodId || ""}
                                onChange={(e) =>
                                    setApptData((prev) => ({
                                        ...prev,
                                        paymentMethodId: e.target.value,
                                    }))
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

                    {/* Footer */}
                    <div className="pd-modal-footer">
                        <button
                            className="pd-btn pd-btn-outline"
                            onClick={() => {
                                setShowCalendar(false);
                                onClose?.();
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="pd-btn pd-btn-primary"
                            disabled={saving}
                            onClick={handleUpdateAppt}
                        >
                            <Check size={13} />
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightboxImg && (
                <div
                    className="pd-lightbox-bg"
                    onClick={() => setLightboxImg(null)}
                >
                    <button
                        className="pd-lightbox-close"
                        onClick={() => setLightboxImg(null)}
                    >
                        <X size={15} />
                    </button>
                    <img
                        className="pd-lightbox-img"
                        src={lightboxImg.url}
                        alt="appointment"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </>
    );
};

export default EditAppointment;
