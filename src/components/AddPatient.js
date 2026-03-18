import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ServiceList from "./ServiceList";
import { jwtDecode } from "jwt-decode";
import { authFetch } from "./authfetch";
import { IndianRupee } from "lucide-react";
import SlotPicker from "./Slotpicker";
import {
    generateSlots,
    // getNextAvailableSlot,
} from "../components/utils/Slotsutils";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/dark.css";

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
    const formatTime = (time) => {
        return time;
    };
    const [availableServices, setAvailableServices] = useState([]);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const getTodayIST = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset(); // in minutes
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
    //es
    const [availability, setAvailability] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState("");
    const [openSection, setOpenSection] = useState("Morning");
    const [bookedSlots, setBookedSlots] = useState([]);
    // const isBooked = bookedSlots.includes(slot);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN").format(value);
    };
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
                console.error("Error fetching services:", err);
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

            if (data.success) {
                setAvailability(data.availability || []);
            }
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

    // ✅ SECOND: allSlots
    const allSlots = useMemo(() => {
        let slots = [];

        Object.values(groupedSlots).forEach((group) => {
            slots = [...slots, ...group];
        });

        return slots.sort((a, b) => {
            const [h1, m1] = a.split(":").map(Number);
            const [h2, m2] = b.split(":").map(Number);
            return h1 * 60 + m1 - (h2 * 60 + m2);
        });
    }, [groupedSlots]);

    // ✅ CURRENT SLOT
    const currentSlot = useMemo(() => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let current = null;

        for (let slot of allSlots) {
            const [h, m] = slot.split(":").map(Number);
            const minutes = h * 60 + m;

            if (minutes <= currentMinutes) {
                current = slot;
            } else {
                break;
            }
        }

        return current;
    }, [allSlots]);

    // ✅ NEXT SLOT (AFTER CURRENT)
    const nextSlot = useMemo(() => {
        if (!currentSlot) {
            return allSlots.find((s) => !bookedSlots.includes(s)) || null;
        }

        const index = allSlots.indexOf(currentSlot);

        for (let i = index + 1; i < allSlots.length; i++) {
            if (!bookedSlots.includes(allSlots[i])) {
                return allSlots[i];
            }
        }

        return null;
    }, [allSlots, currentSlot, bookedSlots]);

    useEffect(() => {
        if (!nextSlot) return;

        setSelectedSlot(nextSlot);
    }, [nextSlot]);
    // CALCULATE TOTAL
    const serviceTotal = useMemo(() => {
        return service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
    }, [service, serviceAmounts]);

    const finalAmount = serviceTotal;

    // AUTO SET COLLECTED = FINAL WHEN SERVICES CHANGE

    useEffect(() => {
        setPatient((prev) => ({
            ...prev,
            amount: finalAmount,
        }));
    }, [finalAmount]);

    // INPUT HANDLER

    const onChange = (e) => {
        setPatient({ ...patient, [e.target.name]: e.target.value });
    };
    const calculatedDiscount = useMemo(() => {
        if (!discount || discount <= 0) return 0;

        let value = isPercent ? (finalAmount * discount) / 100 : discount;

        return Math.round(value);
    }, [discount, isPercent, finalAmount]);

    useEffect(() => {
        if (collectFull) {
            const autoCollected = Math.max(
                Math.round(finalAmount - calculatedDiscount),
                0,
            );

            setPatient((prev) => ({
                ...prev,
                amount: autoCollected,
            }));
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

    // SUBMIT
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 🚨 SERVICE REQUIRED
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
        // extract doctorId once
        if (isPercent) {
            setDiscount((finalAmount * discount) / 100);
        }
        const collectedAmount = Number(patient.amount) || 0;
        const totalAmount = finalAmount;

        let computedStatus = "Unpaid";
        let computedRemaining = totalAmount;

        if (collectedAmount >= totalAmount) {
            computedStatus = "Paid";
            computedRemaining = 0;
        } else if (collectedAmount > 0) {
            computedStatus = "Partial";
            computedRemaining = totalAmount - collectedAmount;
        }
        try {
            // 1️⃣ CREATE PATIENT
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

            // 2️⃣ CREATE APPOINTMENT (billing happens here)
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
            } else {
                showAlert("Patient added but appointment failed", "warning");
            }
        } catch (err) {
            console.log(err);
            showAlert("Server error", "danger");
        }
    };

    return (
        showModal && (
            <form onSubmit={handleSubmit}>
                <div className="modal-content border-0 shadow-lg rounded-4">
                    {/* HEADER */}
                    <div className="modal-header border-0 pb-2">
                        <div>
                            <h5 className="modal-title fw-semibold mb-0">
                                Add Patient
                            </h5>
                            <small className="text-theme-secondary">
                                Create patient & initial appointment
                            </small>
                        </div>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setShowModal(false)}
                        />
                    </div>

                    {/* BODY */}
                    <div className="modal-body pt-3">
                        {/* BASIC INFO */}
                        <h6 className="text-uppercase text-theme-secondary small mb-3">
                            Patient Details
                        </h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label small">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    className="form-control rounded-3"
                                    name="name"
                                    value={name}
                                    onChange={onChange}
                                    placeholder="Enter patient name"
                                    required
                                />
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">
                                    Gender
                                </label>
                                <select
                                    className="form-select rounded-3"
                                    name="gender"
                                    value={gender}
                                    onChange={onChange}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>

                            <div className="col-md-3">
                                <label className="form-label small">Age</label>
                                <input
                                    type="number"
                                    className="form-control rounded-3"
                                    name="age"
                                    value={age}
                                    onChange={onChange}
                                    placeholder="Age"
                                />
                            </div>
                        </div>
                        {/* CONTACT */}
                        <div className="mb-4">
                            <label className="form-label small">
                                Mobile Number
                            </label>
                            <input
                                type="tel"
                                className="form-control rounded-3"
                                name="number"
                                value={number}
                                placeholder="10-digit mobile number"
                                onChange={(e) => {
                                    const onlyDigits = e.target.value.replace(
                                        /\D/g,
                                        "",
                                    );
                                    if (onlyDigits.length <= 10) {
                                        setPatient({
                                            ...patient,
                                            number: onlyDigits,
                                        });
                                    }
                                }}
                            />
                        </div>
                        {/* SERVICES */}
                        <h6 className="text-uppercase text-theme-secondary small mb-2">
                            Services & Billing
                        </h6>
                        <div className="mb-3">
                            <ServiceList
                                services={availableServices}
                                selectedServices={service}
                                onAdd={(serviceObj) => {
                                    setPatient((prev) =>
                                        prev.service.some(
                                            (s) => s._id === serviceObj._id,
                                        )
                                            ? prev
                                            : {
                                                  ...prev,
                                                  service: [
                                                      ...prev.service,
                                                      serviceObj,
                                                  ],
                                              },
                                    );

                                    setServiceAmounts((prev) => ({
                                        ...prev,
                                        [serviceObj._id]:
                                            serviceObj.amount ?? 0,
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
                                        const copy = { ...prev };
                                        delete copy[id];
                                        return copy;
                                    });
                                }}
                            />
                        </div>
                        {/* BILLING */}
                        {service.length > 0 && (
                            <div className="mb-4">
                                {/* SERVICES TABLE */}
                                <table className="table table-sm align-middle mb-3">
                                    <thead className="table-theme">
                                        <tr>
                                            <th>Service</th>
                                            <th className="text-end">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {service.map((s) => (
                                            <tr
                                                key={s._id}
                                                className="service-row"
                                            >
                                                <td className="service-name">
                                                    {s.name}
                                                </td>

                                                <td className="text-end">
                                                    <div className="amount-input-wrapper">
                                                        <IndianRupee
                                                            size={14}
                                                            className="me-1 text-theme-secondary"
                                                        />
                                                        <input
                                                            type="number"
                                                            className="amount-input"
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
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* TOTAL */}
                                <div className="d-flex justify-content-between fw-semibold mt-3">
                                    <span>Final Amount</span>
                                    <span className="text-primary">
                                        <IndianRupee size={18} />{" "}
                                        {formatCurrency(finalAmount)}
                                    </span>
                                </div>
                            </div>
                        )}
                        {/* DISCOUNT SECTION */}
                        <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label fw-semibold mb-0">
                                    Discount
                                </label>
                                <div className="form-check form-switch">
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        checked={isPercent}
                                        onChange={(e) =>
                                            setIsPercent(e.target.checked)
                                        }
                                    />
                                    <label className="form-check-label small">
                                        {isPercent ? (
                                            "Percentage (%)"
                                        ) : (
                                            <>
                                                Flat Amount{" "}
                                                <IndianRupee size={18} />
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                            <input
                                type="number"
                                className="form-control rounded-3"
                                placeholder={
                                    isPercent ? "Enter %" : "Enter amount"
                                }
                                value={discount}
                                min={0}
                                max={isPercent ? 100 : finalAmount}
                                onChange={(e) => {
                                    let value = Number(e.target.value);
                                    if (value < 0) value = 0;
                                    if (isPercent && value > 100) value = 100;
                                    if (!isPercent && value > finalAmount)
                                        value = finalAmount;
                                    setDiscount(value);
                                }}
                            />
                        </div>
                        {/* AMOUNT COLLECTED */}
                        <div className="amount-collect-wrapper mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="fw-semibold">
                                    Amount Collected {collectFull && "(Auto)"}
                                </span>

                                <div className="amount-input-wrapper">
                                    <IndianRupee
                                        size={14}
                                        className="me-1 text-theme-secondary"
                                    />

                                    <input
                                        type="number"
                                        className="amount-input"
                                        value={patient.amount.toFixed(2)}
                                        disabled={collectFull}
                                        onChange={(e) =>
                                            setPatient((prev) => ({
                                                ...prev,
                                                amount: Number(e.target.value),
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="form-check mb-2">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={collectFull}
                                onChange={(e) =>
                                    setCollectFull(e.target.checked)
                                }
                            />
                            <label className="form-check-label small">
                                Collect full payable amount automatically
                            </label>
                        </div>
                        {/* DISCOUNT GIVEN */}
                        <div className="d-flex justify-content-between">
                            <span className="text-theme-secondary">
                                Discount Given
                            </span>
                            <span className="text-danger">
                                <IndianRupee size={18} />{" "}
                                {formatCurrency(calculatedDiscount)}
                            </span>
                        </div>
                        {/* PAYABLE AMOUNT */}
                        <div className="d-flex justify-content-between fw-semibold mt-2">
                            <span>Payable Amount</span>
                            <span className="text-success">
                                <IndianRupee size={18} />
                                {formatCurrency(
                                    Math.max(
                                        finalAmount -
                                            patient.amount -
                                            calculatedDiscount,
                                        0,
                                    ),
                                )}
                            </span>
                        </div>
                        {/* APPOINTMENT */}
                        <h6 className="text-uppercase text-theme-secondary mt-4 mb-2">
                            Appointment & Payment
                        </h6>
                        <div className="row g-3">
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

                            <div className="col-md-6">
                                <label className="form-label small">
                                    Payment Type
                                </label>
                                <select
                                    className="form-select rounded-3"
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

                    {/* FOOTER */}
                    <div className="modal-footer border-0">
                        <button
                            type="button"
                            className="btn btn-outline-secondary rounded-3"
                            onClick={() => setShowModal(false)}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary rounded-3 px-4"
                            disabled={service.length === 0}
                        >
                            Save & Create
                        </button>
                    </div>
                </div>
            </form>
        )
    );
};

export default AddPatient;
