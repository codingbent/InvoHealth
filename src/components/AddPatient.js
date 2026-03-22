import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ServiceList from "./ServiceList";
import { jwtDecode } from "jwt-decode";
import { authFetch } from "./authfetch";
import { IndianRupee, UserPlus, X, Check, CalendarArrowDown } from "lucide-react";
import SlotPicker from "./Slotpicker";
import { generateSlots } from "../components/utils/Slotsutils";
import "flatpickr/dist/themes/dark.css";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

const AddPatient = ({ showAlert, showModal, setShowModal }) => {
    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );

    const [patient, setPatient] = useState({
        name: "",
        service: [],
        number: "",
        amount: 0,
        age: "",
        gender: "Male",
    });
    const navigate = useNavigate();
    const formatTime = (time) => time;
    const [availableServices, setAvailableServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const getTodayIST = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const istTime = new Date(now.getTime() - offset * 60000);
        return istTime.toISOString().slice(0, 10);
    };
    const [appointmentDate, setAppointmentDate] = useState(getTodayIST());
    const [payment_type, setPaymentType] = useState("Cash");
    const [collectFull, setCollectFull] = useState(true);
    const { name, service, number, age, gender } = patient;
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    const doctorId = decoded.user?.doctorId;
    const [availability, setAvailability] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [openSection, setOpenSection] = useState("Morning");
    const [bookedSlots, setBookedSlots] = useState([]);
    const [showCalendar, setShowCalendar] = useState(false);

    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);

    useEffect(() => {
        const fetchServices = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/services/fetchall_services`,
                );
                const data = await res.json();
                setAvailableServices(
                    Array.isArray(data) ? data : data.services || [],
                );
            } catch (err) {
                console.error(err);
            }
        };
        fetchServices();
    }, [API_BASE_URL]);

    useEffect(() => {
        const fetchAvailability = async () => {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/timing/get_availability`,
            );
            const data = await res.json();
            if (data.success) setAvailability(data.availability || []);
        };
        fetchAvailability();
    }, [API_BASE_URL]);

    useEffect(() => {
        if (!availability.length) return;
        const fetchSlots = async () => {
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
        fetchSlots();
    }, [appointmentDate, availability, API_BASE_URL]);

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

    // const allSlots = useMemo(() => {
    //     let slots = [];
    //     Object.values(groupedSlots).forEach((g) => {
    //         slots = [...slots, ...g];
    //     });
    //     return slots.sort((a, b) => {
    //         const [h1, m1] = a.split(":").map(Number);
    //         const [h2, m2] = b.split(":").map(Number);
    //         return h1 * 60 + m1 - (h2 * 60 + m2);
    //     });
    // }, [groupedSlots]);

    const isToday = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return appointmentDate === today;
    }, [appointmentDate]);
    const currentSlot = useMemo(() => {
        if (!timeSlots.length) return null;

        // 🔥 if future date → return first available
        if (!isToday) {
            return (
                timeSlots.find((slot) => !bookedSlots.includes(slot)) || null
            );
        }

        // ✅ today logic
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

        // 🔥 FIX: if not found, find closest slot
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

        // ✅ forward search only
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
            amount: 0,
            age: "",
            gender: "Male",
        });
        setServiceAmounts({});
        setDiscount(0);
        setIsPercent(false);
        setCollectFull(true);
        setAppointmentDate(new Date().toISOString().slice(0, 10));
        setPaymentType("Cash");
    };
    const onChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!service || service.length === 0) {
            showAlert("Please select at least one service", "warning");
            return;
        }
        if (number.length !== 10) {
            showAlert("Mobile number must be exactly 10 digits", "warning");
            return;
        }
        let finalNumber = number.trim();
        if (!isPercent && discount > serviceTotal) {
            showAlert("Discount cannot exceed total amount", "warning");
            return;
        }
        if (
            patient.amount > finalAmount ||
            patient.amount > finalAmount - calculatedDiscount
        ) {
            showAlert("Collected amount cannot exceed final amount", "warning");
            return;
        }
        if (isPercent && discount > 100) {
            showAlert("Percentage cannot exceed 100%", "warning");
            return;
        }
        if (isPercent) setDiscount((finalAmount * discount) / 100);
        const collectedAmount = Number(patient.amount) || 0;
        const totalAmount = finalAmount;
        let computedStatus = "Unpaid",
            computedRemaining = totalAmount;
        if (collectedAmount >= totalAmount) {
            computedStatus = "Paid";
            computedRemaining = 0;
        } else if (collectedAmount > 0) {
            computedStatus = "Partial";
            computedRemaining = totalAmount - collectedAmount;
        }
        try {
            const patientRes = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/add_patient`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        gender,
                        number: finalNumber,
                        age,
                    }),
                },
            );
            const patientJson = await patientRes.json();
            if (!patientJson.success) {
                showAlert(
                    patientJson.error || "Failed to add patient",
                    "danger",
                );
                return;
            }
            const newPatientId = patientJson.patient._id;
            const appointmentRes = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/add_appointment/${newPatientId}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        service: service.map((s) => ({
                            id: s._id,
                            name: s.name,
                            amount: serviceAmounts[s._id] ?? s.amount ?? 0,
                        })),
                        collected: patient.amount,
                        status: computedStatus,
                        remaining: computedRemaining,
                        date: appointmentDate,
                        time: selectedSlot,
                        payment_type,
                        doctorId,
                        discount,
                        isPercent,
                    }),
                },
            );
            const appointmentJson = await appointmentRes.json();
            if (appointmentJson.success) {
                showAlert("Patient and appointment added!", "success");
                resetForm();
                setShowModal(false);
                navigate("/");
            } else showAlert("Patient added but appointment failed", "warning");
        } catch (err) {
            console.log(err);
            showAlert("Server error", "danger");
        }
    };

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
        showModal && (
            <>
                <div className="modal-content">
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
                                    <label className="ap-label">
                                        Full Name *
                                    </label>
                                    <input
                                        className="ap-input"
                                        name="name"
                                        value={name}
                                        onChange={onChange}
                                        placeholder="Patient name"
                                        required
                                    />
                                </div>
                                <div className="ap-field">
                                    <label className="ap-label">Gender</label>
                                    <select
                                        className="ap-select"
                                        name="gender"
                                        value={gender}
                                        onChange={onChange}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div className="ap-field">
                                    <label className="ap-label">Age</label>
                                    <input
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
                                <label className="ap-label">
                                    Mobile Number
                                </label>
                                <input
                                    className="ap-input"
                                    type="tel"
                                    name="number"
                                    value={number}
                                    placeholder="10-digit number"
                                    onChange={(e) => {
                                        const d = e.target.value.replace(
                                            /\D/g,
                                            "",
                                        );
                                        if (d.length <= 10)
                                            setPatient({
                                                ...patient,
                                                number: d,
                                            });
                                    }}
                                />
                            </div>

                            {/* Services */}
                            <div className="ap-section">Services & Billing</div>
                            <ServiceList
                                services={availableServices}
                                selectedServices={service}
                                onAdd={(s) => {
                                    setPatient((prev) =>
                                        prev.service.some(
                                            (x) => x._id === s._id,
                                        )
                                            ? prev
                                            : {
                                                  ...prev,
                                                  service: [...prev.service, s],
                                              },
                                    );
                                    setServiceAmounts((prev) => ({
                                        ...prev,
                                        [s._id]: s.amount ?? 0,
                                    }));
                                }}
                                onRemove={(id) => {
                                    setPatient((prev) => ({
                                        ...prev,
                                        service: prev.service.filter(
                                            (s) => s._id !== id,
                                        ),
                                    }));
                                    setServiceAmounts((prev) => {
                                        const c = { ...prev };
                                        delete c[id];
                                        return c;
                                    });
                                }}
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
                                                    <IndianRupee size={12} />
                                                    <input
                                                        type="number"
                                                        className="ap-amount-input"
                                                        value={
                                                            serviceAmounts[
                                                                s._id
                                                            ] ?? s.amount
                                                        }
                                                        onChange={(e) =>
                                                            setServiceAmounts(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [s._id]:
                                                                        Number(
                                                                            e
                                                                                .target
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
                                                if (isPercent && v > 100)
                                                    v = 100;
                                                if (
                                                    !isPercent &&
                                                    v > finalAmount
                                                )
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
                                                    setIsPercent(
                                                        e.target.checked,
                                                    )
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
                                                <IndianRupee size={11} />
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
                                                    − <IndianRupee size={11} />
                                                    {fmt(calculatedDiscount)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="ap-summary-row final">
                                            <span>Payable Amount</span>
                                            <span className="ap-summary-val">
                                                <IndianRupee size={12} />
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
                                            <IndianRupee size={12} />
                                            <input
                                                type="number"
                                                className="ap-amount-input"
                                                value={patient.amount.toFixed(
                                                    2,
                                                )}
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
                                        Collect full payable amount
                                        automatically
                                    </label>

                                    {/* Status */}
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 8,
                                            fontSize: 11,
                                        }}
                                    >
                                        <span style={{ color: "#4a5a7a" }}>
                                            Remaining:{" "}
                                            <IndianRupee
                                                size={11}
                                                style={{
                                                    display: "inline",
                                                }}
                                            />
                                            {fmt(
                                                Math.max(
                                                    finalAmount -
                                                        patient.amount -
                                                        calculatedDiscount,
                                                    0,
                                                ),
                                            )}
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

                            {/* Appointment */}
                            <div className="ap-section">
                                Appointment & Payment
                            </div>
                            <div className="ap-grid2">
                                <div className="ap-field">
                                    <label className="ap-label">Date</label>

                                    {/* Trigger button showing selected date */}
                                    <button
                                        type="button"
                                        className="ap-input"
                                        onClick={() =>
                                            setShowCalendar((p) => !p)
                                        }
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
                                                  ).toLocaleDateString(
                                                      "en-IN",
                                                      {
                                                          day: "numeric",
                                                          month: "short",
                                                          year: "numeric",
                                                      },
                                                  )
                                                : "Select date"}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 13,
                                                color: "#3a4a6b",
                                            }}
                                        >
                                            <CalendarArrowDown size={18}/>
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
                                                        ? new Date(
                                                              appointmentDate,
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
                                                    setShowCalendar(false); // close on select
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="ap-field">
                                    <label className="ap-label">
                                        Payment Type
                                    </label>
                                    <select
                                        className="ap-select"
                                        value={payment_type}
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
                                disabled={service.length === 0}
                            >
                                <Check size={13} /> Save & Create
                            </button>
                        </div>
                    </form>
                </div>
            </>
        )
    );
};

export default AddPatient;
