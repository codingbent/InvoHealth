import { useEffect, useState, useMemo } from "react";
import ServiceList from "./ServiceList";
import { authFetch } from "./authfetch";
import { IndianRupee, Plus } from "lucide-react";
import SlotPicker from "./Slotpicker";
import {
    generateSlots,
    getNextAvailableSlot,
} from "../components/utils/Slotsutils";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css";

export default function AddAppointment({ showAlert }) {
    /* ===================== STATES ===================== */
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
        const offset = now.getTimezoneOffset(); // in minutes
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
    // eslint-disable-next-line
    const [bookedSlots, setBookedSlots] = useState([]);

    const [total, setTotal] = useState(0);
    const [finalAmount, setFinalAmount] = useState(0);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN").format(value);
    };
    const discountValue = Math.min(
        isPercent ? (total * discount) / 100 : discount,
        total,
    );

    // ✅ FIRST: groupedSlots
    const groupedSlots = useMemo(() => {
        const groups = {
            Morning: [],
            Afternoon: [],
            Evening: [],
        };

        timeSlots.forEach((slot) => {
            const hour = parseInt(slot.split(":")[0]);

            if (hour < 12) groups.Morning.push(slot);
            else if (hour < 16) groups.Afternoon.push(slot);
            else groups.Evening.push(slot);
        });

        return groups;
    }, [timeSlots]);

    const currentSlot = useMemo(() => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let current = null;

        timeSlots.forEach((slot) => {
            const [h, m] = slot.split(":").map(Number);
            const minutes = h * 60 + m;

            if (minutes <= currentMinutes) {
                current = slot;
            }
        });

        return current;
    }, [timeSlots]);

    const nextSlot = useMemo(() => {
        if (!currentSlot) {
            return timeSlots.find((s) => !bookedSlots.includes(s)) || null;
        }

        const index = timeSlots.indexOf(currentSlot);

        for (let i = index + 1; i < timeSlots.length; i++) {
            if (!bookedSlots.includes(timeSlots[i])) {
                return timeSlots[i];
            }
        }

        return null;
    }, [timeSlots, currentSlot, bookedSlots]);
    const remaining = Math.max(finalAmount - collected, 0);

    const status =
        remaining === 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

    const normalizeTime = (time) => {
        if (!time) return "";

        const [h, m] = time.split(":");
        return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
    };
    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/timing/get_availability`,
                );
                const data = await res.json();

                if (data.success) {
                    setAvailability(data.availability || []);
                }
            } catch (err) {
                console.error(err);
            }
        };

        fetchAvailability();
    }, [API_BASE_URL]);

    useEffect(() => {
        if (!timeSlots.length) return;

        const next = getNextAvailableSlot(timeSlots, bookedSlots);

        if (next) {
            setSelectedSlot(next);
        }
    }, [timeSlots, bookedSlots]);

    useEffect(() => {
        if (!availability.length) return;

        const selectedDay = new Date(appointmentDate)
            .toLocaleDateString("en-US", { weekday: "short" })
            .slice(0, 3);

        const today = new Date();
        const isToday =
            new Date(appointmentDate).toDateString() === today.toDateString();

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
                slot.duration || slot.slotduration,
            ).map(normalizeTime);
            allSlots = [...allSlots, ...generated];
        });

        if (isToday) {
            const currentTime = today.getHours() * 60 + today.getMinutes();

            allSlots = allSlots.filter((time) => {
                const [h, m] = time.split(":").map(Number);
                return h * 60 + m > currentTime;
            });
        }

        setTimeSlots(allSlots);
    }, [appointmentDate, availability]);
    const formatTime = (time) => {
        return time;
    };
    /* ===================== FETCH SERVICES ===================== */
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

    /* ===================== PATIENT SEARCH (DEBOUNCED) ===================== */
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

    /* ===================== CALCULATE TOTAL ===================== */
    useEffect(() => {
        const t = services.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
        setTotal(t);

        let discountValue = 0;
        if (discount > 0) {
            discountValue = isPercent ? (t * discount) / 100 : discount;
        }

        if (discountValue > t) discountValue = t;
        setFinalAmount(t - discountValue);
    }, [services, serviceAmounts, discount, isPercent]);

    /* ===================== HANDLERS ===================== */
    const selectPatient = (p) => {
        setSelectedPatient(p);
        setSearchText("");
        setPatients([]);
    };

    const changeServiceAmount = (id, value) => {
        setServiceAmounts((prev) => ({ ...prev, [id]: Number(value) }));
    };

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
        if (!availability.length) return;

        const fetchData = async () => {
            try {
                // 1. Fetch booked slots
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/appointment/booked_slots?date=${appointmentDate}`,
                );
                const data = await res.json();
                const booked = data.slots || [];
                setBookedSlots(booked);

                // 2. Get day
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

                // 3. Generate slots (ONLY ONCE)
                let allSlots = [];

                dayData.slots.forEach((slot) => {
                    const generated = generateSlots(
                        slot.startTime,
                        slot.endTime,
                        slot.slotDuration, // ✅ ONLY THIS
                    );

                    allSlots = [...allSlots, ...generated];
                });

                setTimeSlots(allSlots);
            } catch (err) {
                console.error(err);
            }
        };

        fetchData();
    }, [appointmentDate, availability, API_BASE_URL]);

    useEffect(() => {
        if (!manualOverride) {
            setCollected(finalAmount);
        }
    }, [manualOverride, finalAmount]);
    /* ===================== SUBMIT ===================== */
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

            setTimeout(() => {
                setIsSubmitting(false);
            }, 1500);
        } catch (err) {
            showAlert("Server error", "danger");
            setIsSubmitting(false);
        }
    };

    /* ===================== UI ===================== */
    return (
        <div className="card modify-modal shadow-sm border-0 rounded-4">
            <div className="card-body">
                <h5 className="fw-bold mb-3 text-theme-primary">
                    <Plus size={18} /> Add Appointment
                </h5>

                {/* PATIENT SEARCH */}
                <label className="form-label fw-semibold">Patient</label>
                <input
                    className="form-control mb-2"
                    placeholder="Search by name or phone"
                    value={searchText}
                    onChange={(e) => {
                        const value = e.target.value;
                        setSearchText(value);

                        // if (selectedPatient) {
                        //     setSelectedPatient(null);
                        // }
                    }}
                />

                {patients.length > 0 && (
                    <ul className="list-group mb-3">
                        {patients.map((p) => (
                            <li
                                key={p._id}
                                className="list-group-item list-group-item-action"
                                style={{ cursor: "pointer" }}
                                onClick={() => selectPatient(p)}
                            >
                                {p.name} — {p.number}
                            </li>
                        ))}
                    </ul>
                )}

                {selectedPatient && (
                    <div className="alert alert-success py-2">
                        Selected: <strong>{selectedPatient.name}</strong>
                    </div>
                )}

                {selectedPatient && (
                    <form onSubmit={handleSubmit}>
                        {/* DATE */}
                        <div className="col-md-6">
                            <label className="form-label small">
                                Appointment Date
                            </label>

                            <Flatpickr
                                value={appointmentDate}
                                options={{
                                    dateFormat: "Y-m-d",
                                }}
                                onChange={([date]) => {
                                    setAppointmentDate(
                                        date.toLocaleDateString("en-CA"),
                                    );
                                }}
                                className="form-control rounded-3"
                                placeholder="Select date"
                            />
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

                        {/* SERVICES */}
                        <label className="form-label fw-semibold">
                            Services
                        </label>
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

                        {/* BILL */}
                        {services.length > 0 && (
                            <>
                                <ul className="list-group my-3">
                                    {services.map((s) => (
                                        <li
                                            key={s._id}
                                            className="list-group-item d-flex justify-content-between align-items-center"
                                        >
                                            {s.name}
                                            <input
                                                type="number"
                                                className="form-control w-25"
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
                                        </li>
                                    ))}
                                </ul>

                                {/* DISCOUNT */}
                                <div className="mb-3 d-flex justify-content-around align-items-center">
                                    <label className="form-label fw-semibold mb-0">
                                        Discount
                                    </label>{" "}
                                    <input
                                        type="number"
                                        className="form-control w-50"
                                        placeholder="Discount"
                                        value={discount}
                                        onChange={(e) =>
                                            setDiscount(Number(e.target.value))
                                        }
                                    />
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={isPercent}
                                            onChange={(e) =>
                                                setIsPercent(e.target.checked)
                                            }
                                        />
                                        <label className="form-check-label">
                                            %
                                        </label>
                                    </div>
                                </div>

                                {/* SUMMARY */}
                                <div className="summary-box">
                                    <div className="my-1">
                                        Total: <IndianRupee size={15} />{" "}
                                        {formatCurrency(total)}
                                    </div>
                                    <div className="my-1">
                                        Discount: <IndianRupee size={15} />{" "}
                                        {formatCurrency(discountValue)}
                                    </div>
                                    <div className="fw-bold my-1">
                                        Final: <IndianRupee size={15} />{" "}
                                        {formatCurrency(finalAmount)}
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">
                                        Amount Collected
                                    </label>
                                    <input
                                        type="number"
                                        className="form-control"
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

                                <div className="summary-box">
                                    <div>
                                        Remaining: <IndianRupee size={18} />{" "}
                                        {remaining}
                                    </div>
                                    <div className="fw-semibold">
                                        Status:{" "}
                                        <span
                                            className={
                                                status === "Paid"
                                                    ? "text-success"
                                                    : status === "Partial"
                                                      ? "text-warning"
                                                      : "text-danger"
                                            }
                                        >
                                            {status}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* PAYMENT */}
                        <div className="mb-3">
                            <label className="form-label">Payment Type</label>
                            <select
                                className="form-select"
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                            >
                                <option>Cash</option>
                                <option>Card</option>
                                <option>SBI</option>
                                <option>ICICI</option>
                                <option>HDFC</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <button
                            className="btn btn-primary w-100"
                            type="submit"
                            disabled={isSubmitting || services.length === 0}
                        >
                            {isSubmitting ? "Saving..." : "Save Appointment"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
