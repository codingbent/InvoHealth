import { useEffect, useState, useMemo } from "react";
import ServiceList from "./ServiceList";
import { authFetch } from "./authfetch";
import {
    IndianRupee,
    Plus,
    Search,
    User,
    CalendarDays,
    CreditCard,
    CheckCircle,
} from "lucide-react";
import SlotPicker from "./Slotpicker";
import { generateSlots } from "../components/utils/Slotsutils";
import { DayPicker } from "react-day-picker";

export default function AddAppointment({ showAlert }) {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [searchText, setSearchText] = useState("");
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [collected, setCollected] = useState(0);
    const [allServices, setAllServices] = useState([]);
    const [services, setServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const getTodayIST = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const istTime = new Date(now.getTime() - offset * 60000);
        return istTime.toISOString().slice(0, 10);
    };
    const [appointmentDate, setAppointmentDate] = useState(getTodayIST());
    const [paymentType, setPaymentType] = useState("Cash");
    const [manualOverride, setManualOverride] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [availability, setAvailability] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [openSection, setOpenSection] = useState("Morning");
    const [image, setImage] = useState(null);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [total, setTotal] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);
    const [showCalendar, setShowCalendar] = useState(false);

    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);
    const discountValue = Math.min(
        isPercent ? (total * discount) / 100 : discount,
        total,
    );

    const isToday = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return appointmentDate === today;
    }, [appointmentDate]);
    const groupedSlots = useMemo(() => {
        const groups = { Morning: [], Afternoon: [], Evening: [] };
        timeSlots.forEach((slot) => {
            const hour = parseInt(slot.split(":")[0]);
            if (hour < 12) groups.Morning.push(slot);
            else if (hour < 16) groups.Afternoon.push(slot);
            else groups.Evening.push(slot);
        });
        return groups;
    }, [timeSlots]);

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

    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/timing/get_availability`,
                );
                const data = await res.json();
                if (data.success) setAvailability(data.availability || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchAvailability();
    }, [API_BASE_URL]);

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
        if (!availability.length) return;
        const fetchData = async () => {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/booked_slots?date=${appointmentDate}`,
            );
            const data = await res.json();
            const booked = data.slots || [];
            setBookedSlots(booked);
            const selectedDay = new Date(appointmentDate)
                .toLocaleDateString("en-US", { weekday: "short" })
                .slice(0, 3);
            const dayData = availability.find((d) =>
                d.day.toLowerCase().startsWith(selectedDay.toLowerCase()),
            );
            if (!dayData) {
                setTimeSlots([]);
                return;
            }
            let allSlots = [];
            dayData.slots.forEach((slot) => {
                const generated = generateSlots(
                    slot.startTime,
                    slot.endTime,
                    slot.slotDuration,
                );
                allSlots = [...allSlots, ...generated];
            });
            setTimeSlots(allSlots);
        };
        fetchData();
    }, [appointmentDate, availability, API_BASE_URL]);

    const formatTime = (time) => time;

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/services/fetchall_services`,
                );
                const data = await res.json();
                setAllServices(data.services || data || []);
            } catch (err) {
                console.error(err);
            }
        };
        fetchServices();
    }, [API_BASE_URL]);

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (!searchText.trim()) {
                setPatients([]);
                return;
            }
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/patient/search_patient?q=${searchText}`,
                );
                const data = await res.json();
                setPatients(data);
            } catch (err) {
                console.error(err);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [searchText, API_BASE_URL]);

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
    const resetForm = () => {
        setSelectedPatient(null);
        setServices([]);
        setServiceAmounts({});
        setDiscount(0);
        setIsPercent(false);
        setPaymentType("Cash");
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
        setIsSubmitting(true);

        let imageUrl = "";

        if (image) {
            const formData = new FormData();
            formData.append("image", image);

            const uploadRes = await fetch(
                `${API_BASE_URL}/api/doctor/image/upload`,
                {
                    method: "POST",
                    body: formData,
                },
            );

            const uploadData = await uploadRes.json();

            if (!uploadRes.ok) {
                showAlert("Image upload failed", "danger");
                setIsSubmitting(false);
                return;
            }

            imageUrl = uploadData.url;
        }

        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/add_appointment/${selectedPatient._id}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        service: services.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount,
                        })),
                        amount: finalAmount,
                        collected,
                        remaining,
                        status,
                        payment_type: paymentType,
                        discount,
                        isPercent,
                        date: appointmentDate,
                        time: selectedSlot,
                        image: imageUrl,
                    }),
                },
            );
            const data = await res.json();
            if (!res.ok) {
                showAlert(data.error || "Failed to add appointment", "danger");
                return;
            }
            showAlert("Appointment added successfully", "success");
            resetForm();
            setTimeout(() => setIsSubmitting(false), 1500);
        } catch (err) {
            showAlert("Server error", "danger");
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

        if (file.size > 1 * 1024 * 1024) {
            showAlert("Max 1MB allowed", "warning");
            return;
        }

        setImage(file);
    };

    return (
        <>
            <div className="aa-root">
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
                        <label className="aa-label">Search Patient</label>
                        <div className="aa-search-wrap">
                            <span className="aa-search-icon">
                                <Search size={14} />
                            </span>
                            <input
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
                                formatTime={formatTime}
                                currentSlot={currentSlot}
                                nextSlot={nextSlot}
                            />

                            <div className="aa-section">
                                <div className="aa-section-line" />
                                <span className="aa-section-title">
                                    Services
                                </span>
                                <div className="aa-section-line" />
                            </div>

                            <div className="aa-mb">
                                <ServiceList
                                    services={allServices}
                                    selectedServices={services}
                                    onAdd={(s) =>
                                        setServices((prev) =>
                                            prev.some((x) => x._id === s._id)
                                                ? prev
                                                : [...prev, s],
                                        )
                                    }
                                    onRemove={(id) => {
                                        setServices((prev) =>
                                            prev.filter((s) => s._id !== id),
                                        );
                                        setServiceAmounts((prev) => {
                                            const c = { ...prev };
                                            delete c[id];
                                            return c;
                                        });
                                    }}
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
                                                <IndianRupee size={12} />
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
                                                    − <IndianRupee size={12} />
                                                    {fmt(discountValue)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="aa-summary-row final">
                                            <span>Final Amount</span>
                                            <span className="aa-summary-val">
                                                <IndianRupee size={13} />
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
                                            Remaining{" "}
                                            <IndianRupee
                                                size={12}
                                                style={{ display: "inline" }}
                                            />
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
                                <label className="aa-label">
                                    <CreditCard
                                        size={11}
                                        style={{
                                            display: "inline",
                                            marginRight: 5,
                                        }}
                                    />
                                    Payment Type
                                </label>
                                <select
                                    className="aa-select"
                                    value={paymentType}
                                    onChange={(e) =>
                                        setPaymentType(e.target.value)
                                    }
                                >
                                    <option>Cash</option>
                                    <option>Card</option>
                                    <option>SBI</option>
                                    <option>ICICI</option>
                                    <option>HDFC</option>
                                    <option>Other</option>
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
                                        — max 1 MB
                                    </span>
                                </label>
                                <input
                                    id="fileInput"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={handleImageChange}
                                />

                                <div className="aa-upload-btns">
                                    <button
                                        type="button"
                                        className="aa-upload-btn"
                                        onClick={() =>
                                            document
                                                .getElementById("fileInput")
                                                .click()
                                        }
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
