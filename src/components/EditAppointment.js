import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { authFetch } from "./authfetch";
import { DayPicker } from "react-day-picker";
import { X, Check, CalendarDays, ImageIcon, File } from "lucide-react";
import { API_BASE_URL } from "../components/config";
import { fetchPaymentMethods } from "../api/payment.api";
import ServiceList from "./ServiceList";

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
];
const MAX_IMAGES = 10;

const EditAppointment = ({
    showAlert,
    currency,
    appointmentId,
    visit,
    availableServices = [],
    onClose,
    onSaved,
    usage,
}) => {
    // ─── Slot / calendar state ────────────────────────────────────────────────
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
    const [existingImages, setExistingImages] = useState([]);
    const [newImageFiles, setNewImageFiles] = useState([]);
    const [removedUrls, setRemovedUrls] = useState([]);
    const [lightboxImg, setLightboxImg] = useState(null);

    // ─── Payment options ──────────────────────────────────────────────────────
    const [paymentOptions, setPaymentOptions] = useState([]);

    // ─── Saving flag ──────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);

    const availabilityRef = useRef(availability);
    useEffect(() => {
        availabilityRef.current = availability;
    }, [availability]);

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

    const dateLabel = (d) => {
        if (!d) return "Select date";

        const [y, m, day] = d.split("-").map(Number);

        return new Date(y, m - 1, day).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

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

    // Image usage stats
    const imagesUsed = usage?.images?.used || 0;
    const imagesLimit = usage?.images?.limit ?? 0;
    // const totalImagesAfterSave = existingImages.length + newImageFiles.length;
    // const canAddMoreImages =
    //     totalImagesAfterSave < MAX_IMAGES &&
    //     (imagesLimit === -1 || imagesUsed + newImageFiles.length < imagesLimit);

    // ─── Data fetches ─────────────────────────────────────────────────────────
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

    // ─── Populate form from visit prop ────────────────────────────────────────
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

        setApptData({
            date: visit.date?.slice(0, 10) || "",
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

        // ── Merge legacy image + images array ──────────────────────────────
        const imgs = [];
        if (Array.isArray(visit.images)) {
            visit.images.forEach((img) => {
                if (typeof img === "string") {
                    imgs.push({ url: img, type: "image" });
                } else if (img?.url) {
                    imgs.push(img);
                }
            });
        } else if (visit.image) {
            imgs.push({ url: visit.image, type: "image" });
        }

        setExistingImages(imgs);
        setNewImageFiles([]);
        setRemovedUrls([]);
    }, [visit, availableServices]);

    const fetchSlotsForDate = useCallback(
        async (date, isEdit = false) => {
            const avail = availabilityRef.current;
            if (!date || !avail.length) return;

            try {
                const [y, m, d] = date.split("-").map(Number);
                const localDate = new Date(y, m - 1, d);
                const selectedDay = localDate.toLocaleDateString("en-US", {
                    weekday: "short",
                });
                const dayData = avail.find((d) => d.day === selectedDay);
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
                setBookedSlots(data.slots || []);

                if (isEdit) {
                    setTimeSlots(allSlots);
                    return;
                }

                const today = new Date();

                const selectedDate = new Date(y, m - 1, d);

                const isToday =
                    selectedDate.toDateString() === today.toDateString();
                if (isToday) {
                    const ct = today.getHours() * 60 + today.getMinutes();
                    allSlots = allSlots.filter((t) => {
                        const [h, m] = t.split(":").map(Number);
                        return h * 60 + m > ct;
                    });
                }
                setTimeSlots(
                    allSlots.filter((s) => !(data.slots || []).includes(s)),
                );
            } catch (err) {
                console.error("slot fetch error:", err);
            }
        },
        [generateSlots], // FIX: removed `availability` — read via ref instead
    );

    // Trigger slot fetch only when date changes (not when availability ref updates)
    useEffect(() => {
        if (!apptData.date || !availabilityRef.current.length) return;
        fetchSlotsForDate(apptData.date, true);
    }, [apptData.date, fetchSlotsForDate]);

    // Re-fetch slots once availability loads (runs once on mount after fetch)
    useEffect(() => {
        if (!availability.length || !apptData.date) return;
        fetchSlotsForDate(apptData.date, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availability]);

    useEffect(() => {
        if (!apptData.time) return;
        const hour = parseInt(apptData.time.split(":")[0]);
        if (hour < 12) setOpenSection("Morning");
        else if (hour < 16) setOpenSection("Afternoon");
        else setOpenSection("Evening");
    }, [apptData.time]);

    // ─── finalAmount calculation ──────────────────────────────────────────────
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

    useEffect(() => {
        if (finalAmount > 0) setCollected(initialCollected);
    }, [finalAmount, initialCollected]);

    useEffect(() => {
        setCollected((prev) => (prev > finalAmount ? finalAmount : prev));
    }, [finalAmount]);

    useEffect(() => {
        if (isFullPaid) setCollected(finalAmount);
    }, [isFullPaid, finalAmount]);

    // ─── Slot helpers ─────────────────────────────────────────────────────────
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

    // ─── Image handlers ───────────────────────────────────────────────────────
    const handleImageChange = (e) => {
        const newFiles = Array.from(e.target.files || []);
        if (!newFiles.length) return;

        const errors = [],
            valid = [];
        for (const file of newFiles) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                errors.push(`${file.name}: only images or PDFs allowed`);
                continue;
            }
            if (file.size > 2 * 1024 * 1024) {
                errors.push(`${file.name}: exceeds 2MB`);
                continue;
            }
            valid.push(file);
        }
        if (errors.length) showAlert(errors.join("; "), "warning");
        if (!valid.length) return;

        const slotsLeft = Math.min(
            MAX_IMAGES - (existingImages.length + newImageFiles.length),
            imagesLimit === -1
                ? MAX_IMAGES
                : imagesLimit - imagesUsed - newImageFiles.length,
        );

        if (valid.length > slotsLeft) {
            showAlert(`Only ${slotsLeft} more image(s) allowed`, "warning");
            valid.splice(slotsLeft);
        }

        setNewImageFiles((prev) => [
            ...prev,
            ...valid.map((f) => ({
                file: f,
                preview: f.type.startsWith("image/")
                    ? URL.createObjectURL(f)
                    : null,
            })),
        ]);
        e.target.value = "";
    };

    const handleRemoveExisting = (imgObj) => {
        if (
            !window.confirm(
                "Remove this image? It will be permanently deleted when you save.",
            )
        )
            return;

        setExistingImages((prev) => prev.filter((i) => i.url !== imgObj.url));
        setRemovedUrls((prev) => [...prev, imgObj.url]);
    };

    const handleRemoveNew = (index) => {
        setNewImageFiles((prev) => {
            const updated = [...prev];
            if (updated[index].preview)
                URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    // ─── Validation ───────────────────────────────────────────────────────────
    const validateForm = () => {
        if (!apptData.date) return "Please select a date";
        if (timeSlots.length > 0 && !apptData.time)
            return "Please select a time slot";
        if (!apptData.service.length) return "Please add at least one service";
        if (!apptData.paymentMethodId) return "Please select payment type";
        return "";
    };

    // ─── Submit ───────────────────────────────────────────────────────────────
    const handleUpdateAppt = async () => {
        const error = validateForm();
        if (error) {
            showAlert(error, "warning");
            return;
        }

        setSaving(true);

        const timeoutId = setTimeout(() => {
            setSaving(false);
            showAlert(
                "Request timed out. Please check your connection and try again.",
                "danger",
            );
        }, 30000);

        try {
            let uploadedUrls = [];

            // ONLY upload if new images exist
            if (newImageFiles.length > 0) {
                const formData = new FormData();

                for (const { file } of newImageFiles) {
                    formData.append("images", file);
                }

                const uploadRes = await authFetch(
                    `${API_BASE_URL}/api/doctor/image/upload-multi`,
                    {
                        method: "POST",
                        body: formData,
                    },
                );

                const uploadData = await uploadRes.json();

                if (!uploadRes.ok) {
                    showAlert(
                        uploadData.error || "Image upload failed",
                        "danger",
                    );
                    return;
                }

                uploadedUrls = uploadData.images || [];
            }

            // ONLY delete if something removed
            if (removedUrls.length > 0) {
                await Promise.allSettled(
                    removedUrls.map((url) =>
                        authFetch(
                            `${API_BASE_URL}/api/doctor/image/delete_image/${appointmentId}/${visit._id}`,
                            {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ imageUrl: url }),
                            },
                        ),
                    ),
                );
            }

            const extractPublicId = (url) => {
                if (!url) return "";
                // Strip fl_attachment and other transformations before extracting
                const cleaned = url.replace(/\/upload\/([^/]+\/)*/, "/upload/");
                const m = cleaned.match(
                    /\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i,
                );
                return m?.[1] ?? "";
            };

            const normalizedExisting = existingImages.map((img) => {
                const url = img?.url || (typeof img === "string" ? img : "");

                const isPDF =
                    img?.type === "application/pdf" ||
                    img?.resource_type === "raw" ||
                    url.includes("/raw/upload") ||
                    url.includes("fl_attachment") ||
                    url.toLowerCase().endsWith(".pdf");

                const publicId = img?.public_id || extractPublicId(url);

                return {
                    url,
                    public_id: publicId,
                    resource_type: isPDF ? "raw" : "image",
                    type: isPDF ? "application/pdf" : img?.type || "image/jpeg",
                };
            });
            // Merge images correctly
            const finalImages = [...normalizedExisting, ...uploadedUrls];

            // IMPORTANT: If nothing changed → avoid unnecessary image update
            const shouldSendImages =
                newImageFiles.length > 0 || removedUrls.length > 0;

            // Update appointment
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/edit_appointment/${appointmentId}/${visit._id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        date: apptData.date,
                        time: apptData.time || null,
                        service: apptData.service.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        paymentMethodId: selectedPayment?.id || null,
                        discount,
                        isPercent,
                        collected,
                        ...(shouldSendImages && { images: finalImages }),
                    }),
                },
            );

            const data = await response.json();

            if (data.success) {
                showAlert("Appointment updated successfully!", "success");
                onSaved?.();
                onClose?.();
            } else {
                showAlert(data.message || "Update failed", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert(err.message, "danger");
        } finally {
            clearTimeout(timeoutId);
            setSaving(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <>
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
                        {/* Date picker */}
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
                                                ? (() => {
                                                      const [y, m, d] =
                                                          apptData.date
                                                              .split("-")
                                                              .map(Number);

                                                      return new Date(
                                                          y,
                                                          m - 1,
                                                          d,
                                                      );
                                                  })()
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

                        {/* Current time label */}
                        <div className="pd-current-slot">
                            {apptData.time
                                ? formatTime(apptData.time)
                                : "No time selected"}
                        </div>

                        {/* Time slots */}
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

                        {/* Services */}
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
                                                - {currency?.symbol}
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

                        {/* Discount */}
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

                        {/* Collection */}
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

                        {/* ── Multi-image upload ── */}
                        {existingImages.length > 0 && (
                            <div className="pd-section-sep">
                                <ImageIcon
                                    size={11}
                                    style={{ marginRight: 5 }}
                                />
                                Images
                            </div>
                        )}
                        {existingImages.length > 0 && (
                            <div className="pd-field">
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <label
                                        className="pd-label"
                                        style={{ margin: 0 }}
                                    >
                                        Upload Images
                                        <span
                                            style={{
                                                fontSize: 9,
                                                marginLeft: 6,
                                                textTransform: "none",
                                                letterSpacing: 0,
                                            }}
                                        >
                                            - max 2MB (images, PDF)
                                        </span>
                                    </label>
                                    <span
                                        style={{
                                            fontSize: 10,
                                            color: "#6b7fa8",
                                        }}
                                    >
                                        {existingImages.length +
                                            newImageFiles.length}
                                        /{MAX_IMAGES} max
                                    </span>
                                </div>

                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    multiple
                                    style={{ display: "none" }}
                                    id="editImageInput"
                                    onChange={handleImageChange}
                                />

                                {/* Existing + New Images Combined Grid */}
                                {(existingImages.length > 0 ||
                                    newImageFiles.length > 0) && (
                                    <div className="pd-images-grid">
                                        {/* Existing Images */}
                                        {existingImages.map((img, idx) => {
                                            const url =
                                                typeof img === "string"
                                                    ? img
                                                    : img?.url || "";
                                            const isPDF =
                                                img?.type ===
                                                    "application/pdf" ||
                                                (url &&
                                                    url.includes(
                                                        "/raw/upload",
                                                    )) ||
                                                (url &&
                                                    url.includes(
                                                        "fl_attachment",
                                                    ));

                                            return (
                                                <div
                                                    key={`existing-${idx}`}
                                                    className="pd-preview-card"
                                                >
                                                    {isPDF ? (
                                                        <div
                                                            className="pd-pdf-preview"
                                                            onClick={() =>
                                                                window.open(
                                                                    url,
                                                                    "_blank",
                                                                )
                                                            }
                                                            style={{
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            📄
                                                            <span className="pd-preview-name">
                                                                PDF
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={url}
                                                            alt={`img-${idx}`}
                                                            className="pd-preview-img"
                                                            onClick={() =>
                                                                setLightboxImg({
                                                                    url,
                                                                    date: "",
                                                                })
                                                            }
                                                        />
                                                    )}

                                                    <div className="pd-preview-overlay">
                                                        <span className="pd-preview-name">
                                                            Saved
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        className="pd-preview-remove"
                                                        onClick={() =>
                                                            handleRemoveExisting(
                                                                img,
                                                            )
                                                        }
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* New Images */}
                                        {newImageFiles.map(
                                            ({ file, preview }, idx) => (
                                                <div
                                                    key={`new-${idx}`}
                                                    className="pd-preview-card"
                                                >
                                                    {file.type ===
                                                    "application/pdf" ? (
                                                        <div
                                                            className="ap-pdf-preview"
                                                            onClick={() =>
                                                                window.open(
                                                                    URL.createObjectURL(
                                                                        file,
                                                                    ),
                                                                    "_blank",
                                                                )
                                                            }
                                                            style={{
                                                                cursor: "pointer",
                                                            }}
                                                        >
                                                            <File size={18} />
                                                            <span>
                                                                {file.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={preview}
                                                            alt={file.name}
                                                            className="ap-preview-img"
                                                        />
                                                    )}
                                                    <div className="pd-preview-overlay">
                                                        <span className="pd-preview-name">
                                                            {file.type ===
                                                            "application/pdf"
                                                                ? `${(file.size / 1024).toFixed(0)} KB`
                                                                : file.name}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="pd-preview-remove"
                                                        onClick={() =>
                                                            handleRemoveNew(idx)
                                                        }
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}

                                {/* Add more button
                            {canAddMoreImages && (
                                <button
                                    type="button"
                                    className="pd-upload-btn"
                                    style={{ marginTop: 8 }}
                                    onClick={() =>
                                        document
                                            .getElementById("editImageInput")
                                            ?.click()
                                    }
                                >
                                    + Add Images
                                </button>
                            )}
                            {!canAddMoreImages &&
                                totalImagesAfterSave >= MAX_IMAGES && (
                                    <p
                                        style={{
                                            fontSize: 10,
                                            color: "#f87171",
                                            marginTop: 6,
                                        }}
                                    >
                                        Maximum {MAX_IMAGES} images per visit.
                                    </p>
                                )} */}
                            </div>
                        )}

                        {/* Payment type */}
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
            {lightboxImg &&
                (() => {
                    const isPDF =
                        lightboxImg.url.includes("/raw/upload") ||
                        lightboxImg.url.includes("fl_attachment");

                    return (
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

                            {isPDF ? (
                                <div
                                    style={{
                                        textAlign: "center",
                                        color: "white",
                                    }}
                                >
                                    <p>PDF File</p>
                                    <button
                                        onClick={() =>
                                            window.open(
                                                lightboxImg.url,
                                                "_blank",
                                            )
                                        }
                                        style={{
                                            padding: "8px 14px",
                                            background: "#2563eb",
                                            border: "none",
                                            borderRadius: 6,
                                            color: "white",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Open PDF
                                    </button>
                                </div>
                            ) : (
                                <img
                                    className="pd-lightbox-img"
                                    src={lightboxImg.url}
                                    alt="appointment"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            )}
                        </div>
                    );
                })()}
        </>
    );
};

export default EditAppointment;
