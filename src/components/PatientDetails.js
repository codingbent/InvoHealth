import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ServiceList from "./ServiceList";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { authFetch } from "./authfetch";
import { toWords } from "number-to-words";
import { DayPicker } from "react-day-picker";
import {
    Pencil,
    Trash2,
    Loader2,
    UserRound,
    User,
    IndianRupee,
    Phone,
    ImageIcon,
    X,
    Check,
    ChevronLeft,
    FileText,
    CalendarDays,
    ReceiptIndianRupee
} from "lucide-react";

export default function PatientDetails(props) {
    const navigate = useNavigate();
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";
    const { id } = useParams();
    const [details, setDetails] = useState(null);
    const [editingAppt, setEditingAppt] = useState(null);
    const [appointmentId, setAppointmentId] = useState(null);
    const [serviceAmounts, setServiceAmounts] = useState({});
    const [discount, setDiscount] = useState(0);
    const [isPercent, setIsPercent] = useState(false);
    const [finalAmount, setFinalAmount] = useState(0);
    const [deleting, setDeleting] = useState(false);
    const [collected, setCollected] = useState(0);
    const [isFullPaid, setIsFullPaid] = useState(false);
    const [initialCollected, setInitialCollected] = useState(0);
    const [availability, setAvailability] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);
    const [openSection, setOpenSection] = useState("Morning");
    const [apptData, setApptData] = useState({
        date: "",
        time: "",
        service: [],
        payment_type: "",
    });
    const [patient, setPatient] = useState({
        name: "",
        service: [],
        number: "",
        age: "",
        gender: "",
        amount: 0,
    });
    const [appointments, setAppointments] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [doctor, setDoctor] = useState(null);
    const [editApptOpen, setEditApptOpen] = useState(false);
    const [editPatientOpen, setEditPatientOpen] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [lightboxImg, setLightboxImg] = useState(null);
    const [recordView, setRecordView] = useState("history"); // "history" | "images"

    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);
    const dateLabel = (d) =>
        !d
            ? "Select date"
            : new Date(d).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
              });

    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/doctor/get_doc`);
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error(err);
        }
    }, [API_BASE_URL]);
    const fetchServices = useCallback(async () => {
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
    }, [API_BASE_URL]);
    const generateSlots = useCallback((start, end, duration) => {
        const step = duration || 15,
            slots = [];
        let [h, m] = start.split(":").map(Number),
            [endH, endM] = end.split(":").map(Number);
        let current = new Date();
        current.setHours(h, m, 0, 0);
        const endTime = new Date();
        endTime.setHours(endH, endM, 0, 0);
        while (current < endTime) {
            slots.push(current.toTimeString().slice(0, 5));
            current.setMinutes(current.getMinutes() + step);
        }
        return slots;
    }, []);

    const fetchSlotsForDate = useCallback(
        async (date, isEdit = false) => {
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
                    const generated = generateSlots(
                        slot.startTime,
                        slot.endTime,
                        slot.slotDuration,
                    );
                    allSlots = [...allSlots, ...generated];
                });
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/appointment/booked_slots?date=${date}`,
                );
                const data = await res.json();
                const booked = data.slots || [];
                setBookedSlots(booked);
                if (isEdit) {
                    setTimeSlots(allSlots);
                    return;
                }
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
                setTimeSlots(allSlots.filter((slot) => !booked.includes(slot)));
            } catch (err) {
                console.error(err);
            }
        },
        [availability, API_BASE_URL, generateSlots],
    );

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

    useEffect(() => {
        if (!apptData.date || !availability.length) return;
        fetchSlotsForDate(apptData.date, !!editingAppt);
    }, [apptData.date, availability, editingAppt, fetchSlotsForDate]);
    useEffect(() => {
        if (editingAppt) return;
        if (
            apptData.time &&
            timeSlots.length > 0 &&
            !timeSlots.includes(apptData.time)
        )
            setApptData((prev) => ({ ...prev, time: "" }));
    }, [timeSlots, apptData.time, editingAppt]);
    useEffect(() => {
        const fetchAvail = async () => {
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
        fetchAvail();
    }, [API_BASE_URL]);
    useEffect(() => {
        if (!timeSlots.length) return;
        if (apptData.time) return;
        if (groupedSlots.Morning.length) setOpenSection("Morning");
        else if (groupedSlots.Afternoon.length) setOpenSection("Afternoon");
        else if (groupedSlots.Evening.length) setOpenSection("Evening");
    }, [timeSlots, groupedSlots, apptData.time]);
    useEffect(() => {
        if (!availableServices.length) return;
        setApptData((prev) => {
            if (!prev.service.length) return prev;
            const normalized = prev.service.map((s) => {
                const match = availableServices.find(
                    (as) => as._id === s._id || as._id === s.id,
                );
                return {
                    ...s,
                    _id: match?._id || s._id,
                    amount: s.amount ?? match?.amount ?? 0,
                };
            });
            return { ...prev, service: normalized };
        });
    }, [availableServices]);

    const handleDeletePatient = async () => {
        const confirmDelete = window.confirm(
            `Are you sure you want to delete patient "${details?.name}"?\nThis will remove all related appointments.`,
        );
        if (!confirmDelete) return;
        try {
            setDeleting(true);
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/delete_patient/${id}`,
                { method: "DELETE" },
            );
            const data = await res.json();
            if (data.success) {
                props.showAlert("Patient deleted successfully", "success");
                navigate("/");
            } else alert(data.message || "Failed to delete patient");
        } catch (err) {
            console.error(err);
            alert("Server error");
        } finally {
            setDeleting(false);
        }
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [patientRes, appointmentsRes] = await Promise.all([
                authFetch(
                    `${API_BASE_URL}/api/doctor/patient/patient_details/${id}`,
                ),
                authFetch(
                    `${API_BASE_URL}/api/doctor/patient/patient_record/${id}`,
                ),
            ]);
            const patientData = await patientRes.json();
            const appointmentsData = await appointmentsRes.json();
            setDetails(patientData);
            setPatient({
                name: patientData.name || "",
                service: patientData.service || [],
                number: patientData.number || "",
                age: patientData.age || "",
                gender: patientData.gender || "",
                amount: patientData.amount || 0,
                collectedAmount: patientData.collected,
            });
            setAppointmentId(appointmentsData.appointmentId);
            setAppointments(appointmentsData.visits || []);
            await fetchServices();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [id, API_BASE_URL, fetchServices]);

    useEffect(() => {
        fetchData();
        fetchDoctor();
    }, [fetchData, fetchDoctor]);
    useEffect(() => {
        if (!apptData.time) return;
        const hour = parseInt(apptData.time.split(":")[0]);
        if (hour < 12) setOpenSection("Morning");
        else if (hour < 16) setOpenSection("Afternoon");
        else setOpenSection("Evening");
    }, [apptData.time]);
    useEffect(() => {
        const total = apptData.service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
        let dv = 0;
        if (discount > 0) {
            dv = isPercent ? total * (discount / 100) : discount;
        }
        if (dv > total) dv = total;
        if (dv < 0) dv = 0;
        setFinalAmount(Math.round((total - dv) * 100) / 100);
    }, [apptData.service, serviceAmounts, discount, isPercent]);

    const formatTime = (time) => {
        if (!time) return "";
        const [h, m] = time.split(":");
        let hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };
    const validateForm = () => {
        if (!apptData.date) return "Please select a date";
        if (timeSlots.length > 0 && !apptData.time)
            return "Please select a time slot";
        if (!apptData.service.length) return "Please add at least one service";
        if (!apptData.payment_type) return "Please select payment type";
        return "";
    };
    const handleChange = (e) =>
        setPatient({ ...patient, [e.target.name]: e.target.value });

    const handleSave = async () => {
        const num = patient.number;
        if (!/^\d{10}$/.test(num)) {
            alert("Enter a valid 10-digit number");
            return;
        }
        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/patient/update_patient/${id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(patient),
                },
            );
            const result = await response.json();
            if (response.ok) {
                props.showAlert("Patient updated successfully", "success");
                setDetails((prev) => ({ ...prev, ...patient }));
                setEditPatientOpen(false);
            } else alert(result.message || "Update failed");
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    };

    const sortedAppointments = useMemo(
        () =>
            [...appointments].sort(
                (a, b) =>
                    new Date(`${b.date}T${b.time || "00:00"}`) -
                    new Date(`${a.date}T${a.time || "00:00"}`),
            ),
        [appointments],
    );
    const serviceTotal = useMemo(
        () =>
            apptData.service.reduce(
                (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
                0,
            ),
        [apptData.service, serviceAmounts],
    );
    const appointmentsForView = useMemo(
        () =>
            sortedAppointments.map((v) => ({
                ...v,
                formattedDate: new Date(v.date).toLocaleDateString("en-IN"),
            })),
        [sortedAppointments],
    );

    useEffect(() => {
        if (editingAppt && finalAmount > 0) setCollected(initialCollected);
    }, [finalAmount, editingAppt, initialCollected]);
    useEffect(() => {
        if (!editingAppt) return;
        setCollected((prev) => (prev > finalAmount ? finalAmount : prev));
    }, [editingAppt, finalAmount]);
    useEffect(() => {
        if (isFullPaid) setCollected(finalAmount);
    }, [isFullPaid, finalAmount]);

    const handleInvoiceClick = async (appointmentId, visit, details) => {
        try {
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/check_invoice_limit`,
            );
            if (!checkRes) {
                alert("Invoice download limit reached");
                return;
            }
            const check = await checkRes.json();
            if (!check.success) {
                alert(check.error);
                return;
            }
            if (check.remaining === 1) {
                const c = window.confirm(
                    "⚠ This is your LAST invoice download for this plan.\n\nDo you want to continue?",
                );
                if (!c) return;
            }
            let includeDiscount = true;
            if (visit.discount && visit.discount > 0) {
                includeDiscount = window.confirm(
                    `This invoice has a discount applied.\n\nDo you want to include the discount in the invoice?`,
                );
            }
            generateInvoicePDF(visit, details, includeDiscount);
            await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/increment_invoice_usage`,
                { method: "POST" },
            );
        } catch (err) {
            console.error(err);
            alert("Failed to generate invoice");
        }
    };

    const generateInvoicePDF = (visit, details, includeDiscount) => {
        try {
            if (!doctor) {
                alert("Doctor details not loaded yet!");
                return;
            }
            const margin = 20,
                invoiceNumber = visit.invoiceNumber || "N/A",
                docPdf = new jsPDF(),
                pageWidth = docPdf.internal.pageSize.getWidth();
            let leftY = 20,
                rightY = 20;
            docPdf.setFontSize(16);
            docPdf.text(doctor.clinicName || "", margin, leftY);
            leftY += 10;
            docPdf.setFontSize(14);
            docPdf.text(doctor.name || "", margin, leftY);
            leftY += 8;
            docPdf.setFontSize(11);
            if (doctor.degree?.length) {
                docPdf.text(doctor.degree.join(","), margin, leftY);
                leftY += 6;
            }
            if (doctor.regNumber) {
                docPdf.text(`Reg No: ${doctor.regNumber}`, margin, leftY);
                leftY += 6;
            }
            docPdf.text(`Invoice No: INV-${invoiceNumber}`, margin, leftY);
            leftY += 8;
            docPdf.text(
                `Patient: ${details.name} | Age: ${details.age || "N/A"} | Gender: ${details.gender || "N/A"}`,
                margin,
                leftY,
            );
            leftY += 6;
            if (doctor.address?.line1) {
                docPdf.text(doctor.address.line1, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }
            if (doctor.address?.line2) {
                docPdf.text(doctor.address.line2, pageWidth - margin, rightY, {
                    align: "right",
                });
                rightY += 5;
            }
            if (doctor.address?.city) {
                docPdf.text(
                    `${doctor.address.city}, ${doctor.address.state} - ${doctor.address.pincode}`,
                    pageWidth - margin,
                    rightY,
                    { align: "right" },
                );
                rightY += 5;
            }
            if (doctor.phone) {
                docPdf.text(
                    `Phone: ${doctor.phone}`,
                    pageWidth - margin,
                    rightY,
                    { align: "right" },
                );
                rightY += 5;
            }
            docPdf.text(
                `Date: ${visit.formattedDate}`,
                pageWidth - margin,
                rightY,
                { align: "right" },
            );
            const services = visit.service || [],
                baseAmount = services.reduce(
                    (sum, s) => sum + Number(s.amount || 0),
                    0,
                );
            let discountValue = 0,
                finalAmt = baseAmount;
            if (includeDiscount && visit.discount > 0) {
                discountValue = visit.isPercent
                    ? (baseAmount * visit.discount) / 100
                    : visit.discount;
                if (discountValue > baseAmount) discountValue = baseAmount;
                if (discountValue < 0) discountValue = 0;
                finalAmt = baseAmount - discountValue;
            }
            const collectedAmount = Number(visit.collected ?? finalAmt),
                remainingAmount = finalAmt - collectedAmount;
            const paymentStatus =
                remainingAmount <= 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";
            const tableRows = services.map((s) => [
                s.name,
                `Rs ${fmt(s.amount)}`,
            ]);
            tableRows.push(["TOTAL AMOUNT", `Rs ${fmt(finalAmt)}`]);
            if (includeDiscount && visit.discount > 0)
                tableRows.push([
                    `Discount ${visit.isPercent ? `(${visit.discount}%)` : `(Rs ${visit.discount})`}`,
                    `- Rs ${fmt(discountValue)}`,
                ]);
            tableRows.push(["Collected", `Rs ${fmt(collectedAmount)}`]);
            if (remainingAmount !== 0)
                tableRows.push([
                    "Payable Amount",
                    `Rs ${fmt(remainingAmount)}`,
                ]);
            tableRows.push(["Status", paymentStatus]);
            autoTable(docPdf, {
                startY: leftY + 4,
                head: [["Service", "Amount"]],
                body: tableRows,
                theme: "grid",
                styles: { fontSize: 11, cellPadding: 3 },
                headStyles: {
                    fillColor: [60, 60, 60],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                },
                didParseCell: (data) => {
                    if (data.row.index >= tableRows.length - 4)
                        data.cell.styles.fontStyle = "bold";
                },
            });
            const roundedAmount = Math.round(finalAmt);
            let y = docPdf.lastAutoTable.finalY + 8;
            const amountInWords =
                `Rupees ${toWords(roundedAmount)} Only`.replace(/\b\w/g, (c) =>
                    c.toUpperCase(),
                );
            docPdf.setFontSize(11);
            docPdf.setFont(undefined, "bold");
            docPdf.text("Amount in Words:", margin, y);
            docPdf.setFont(undefined, "normal");
            docPdf.text(amountInWords, margin + 40, y);
            y += 8;
            let receiptText =
                paymentStatus === "Paid"
                    ? `Received with thanks from ${details.name} the sum of Rupees ${fmt(collectedAmount)} only towards full settlement.`
                    : paymentStatus === "Partial"
                      ? `Part payment of Rupees ${fmt(collectedAmount)} received from ${details.name}. Remaining amount of Rupees ${fmt(remainingAmount)} is pending.`
                      : `Total amount of Rupees ${fmt(finalAmt)} is pending from ${details.name}.`;
            docPdf.setFontSize(11);
            docPdf.text(receiptText, margin, y, {
                maxWidth: pageWidth - margin * 2,
            });
            y += 12;
            docPdf.setFontSize(15);
            docPdf.text(doctor.name, pageWidth - margin, y, { align: "right" });
            y += 6;
            docPdf.setFontSize(12);
            docPdf.text("Signature", pageWidth - margin, y, { align: "right" });
            docPdf.save(`Invoice_${details.name}.pdf`);
        } catch (err) {
            console.error(err);
        }
    };

    const editInvoice = async (appointmentId, visit) => {
        setEditingAppt({ appointmentId, _id: visit._id });
        const normalizedServices = (visit.service || []).map((s) => {
            const rs = availableServices.find(
                (as) => as._id === (s._id || s.id),
            );
            return {
                _id: rs?._id || s._id || s.id,
                name: s.name,
                amount: s.amount ?? rs?.amount ?? 0,
            };
        });
        const date = visit.date?.slice(0, 10);
        setApptData({
            date,
            time: visit.time || "",
            service: normalizedServices,
            payment_type: visit.payment_type || "",
        });
        await fetchSlotsForDate(date, true);
        const amountMap = {};
        normalizedServices.forEach((s) => {
            amountMap[s._id] = s.amount || 0;
        });
        setServiceAmounts(amountMap);
        setDiscount(visit.discount || 0);
        setIsPercent(!!visit.isPercent);
        setInitialCollected(visit.collected || 0);
        setShowCalendar(false);
        setEditApptOpen(true);
    };

    const handleUpdateAppt = async () => {
        if (!editingAppt) {
            alert("No appointment selected");
            return;
        }
        if (!apptData.date) {
            props.showAlert("Please select a date", "danger");
            return;
        }
        if (!apptData.time && timeSlots.length > 0) {
            props.showAlert("Please select a time slot", "danger");
            return;
        }
        if (!apptData.service.length) {
            props.showAlert("Please add at least one service", "danger");
            return;
        }
        try {
            const response = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/edit_appointment/${editingAppt.appointmentId}/${editingAppt._id}`,
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
                        payment_type: apptData.payment_type,
                        discount,
                        isPercent,
                        collected,
                    }),
                },
            );
            const data = await response.json();
            if (data.success) {
                props.showAlert("Appointment updated successfully!", "success");
                setIsFullPaid(false);
                setEditApptOpen(false);
                fetchData();
                window.location.reload();
            } else alert("Update failed: " + data.message);
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    };

    const deleteInvoice = async (appointmentId, visit) => {
        if (!window.confirm("Delete this Appointment?")) return;
        const response = await authFetch(
            `${API_BASE_URL}/api/doctor/appointment/delete_appointment/${appointmentId}/${visit._id}`,
            { method: "DELETE" },
        );
        const data = await response.json();
        if (data.success) {
            alert("Invoice deleted!");
            fetchData();
        } else alert("Delete failed: " + data.message);
    };

    const statusClass = (s) =>
        s === "Paid" ? "pl-paid" : s === "Partial" ? "pl-partial" : "pl-unpaid";

    const patientImages = useMemo(
        () =>
            appointments
                .filter((v) => v.image && v.image !== "")
                .map((v) => ({
                    url: v.image,
                    date: new Date(v.date).toLocaleDateString("en-IN"),
                })),
        [appointments],
    );

    if (loading)
        return (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "60px 0",
                    gap: 12,
                }}
            >
                <div style={{ display: "flex", gap: 8 }}>
                    {[0, 1, 2].map((i) => (
                        <span
                            key={i}
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#2e3d5c",
                                animation: `pd-pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                display: "inline-block",
                            }}
                        />
                    ))}
                </div>
                <span
                    style={{
                        fontSize: 11,
                        color: "#2e3d5c",
                        letterSpacing: "0.08em",
                    }}
                >
                    Loading patient details…
                </span>
                <style>{`@keyframes pd-pulse{0%,80%,100%{transform:scale(1);opacity:.4}40%{transform:scale(1.4);opacity:1}}`}</style>
            </div>
        );

    return (
        <>
            <div className="pd-root">
                <button className="pd-back" onClick={() => navigate("/")}>
                    <ChevronLeft size={14} /> Back
                </button>

                <div className="pd-card">
                    <div className="pd-patient-header">
                        <div className="pd-patient-left">
                            <div className="pd-avatar">
                                {details?.gender === "Female" ? (
                                    <UserRound size={20} />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                            <div className="pd-patient-name">
                                {details?.name}
                            </div>
                        </div>
                    </div>
                    <div className="pd-info-grid">
                        <div className="pd-info-item">
                            <div className="pd-info-label">Age</div>
                            <div className="pd-info-value">
                                {details?.age || "N/A"}
                            </div>
                        </div>
                        <div className="pd-info-item">
                            <div className="pd-info-label">Gender</div>
                            <div className="pd-info-value">
                                {details?.gender || "N/A"}
                            </div>
                        </div>
                        <div className="pd-info-item">
                            <div className="pd-info-label">Contact</div>
                            <a
                                href={`tel:${details?.number}`}
                                style={{
                                    color: "#60a5fa",
                                    textDecoration: "none",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    fontSize: 12,
                                }}
                            >
                                {details?.number} <Phone size={11} />
                            </a>
                        </div>
                    </div>
                    <div className="pd-actions">
                        <button
                            className="pd-btn pd-btn-primary"
                            onClick={() => setEditPatientOpen(true)}
                        >
                            <Pencil size={13} /> Edit Patient
                        </button>
                        <button
                            className="pd-btn pd-btn-danger"
                            disabled={deleting}
                            onClick={handleDeletePatient}
                        >
                            {deleting ? (
                                <>
                                    <Loader2 size={13} className="spin" />{" "}
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={13} /> Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="pd-card">
                    {/* SWITCH */}
                    <div className="pd-switch">
                        <button
                            className={`pd-switch-btn ${recordView === "history" ? "active" : ""}`}
                            onClick={() => setRecordView("history")}
                        >
                            Appointment History
                        </button>

                        <button
                            className={`pd-switch-btn ${recordView === "images" ? "active" : ""}`}
                            onClick={() => setRecordView("images")}
                        >
                            Patient Records
                        </button>
                    </div>

                    {/* ================= HISTORY VIEW ================= */}
                    {recordView === "history" ? (
                        appointmentsForView.length === 0 ? (
                            <div className="pd-gallery-empty">
                                No appointment history
                            </div>
                        ) : (
                            <>
                                <table className="pd-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Services</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Payment</th>
                                            <th className="right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointmentsForView.map((visit) => {
                                            const col = Number(
                                                visit.collected ?? 0,
                                            );
                                            const tot = Number(
                                                visit.amount ?? 0,
                                            );
                                            const rem = tot - col;

                                            const status =
                                                rem <= 0
                                                    ? "Paid"
                                                    : col > 0
                                                      ? "Partial"
                                                      : "Unpaid";

                                            return (
                                                <tr key={visit._id}>
                                                    <td>
                                                        {visit.formattedDate}
                                                    </td>

                                                    <td>
                                                        {(visit.service || [])
                                                            .map((s) => s.name)
                                                            .join(", ")}
                                                    </td>

                                                    <td>
                                                        ₹
                                                        {fmt(visit.amount ?? 0)}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`pl-status ${statusClass(status)}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {visit.payment_type ||
                                                            "N/A"}
                                                    </td>

                                                    <td className="right">
                                                        <div className="pd-action-btns">
                                                            <button
                                                                className="pd-icon-btn pd-icon-inv"
                                                                onClick={() =>
                                                                    handleInvoiceClick(
                                                                        appointmentId,
                                                                        visit,
                                                                        details,
                                                                    )
                                                                }
                                                            >
                                                                <FileText
                                                                    size={13}
                                                                />
                                                            </button>
                                                            <button
                                                                className="pd-icon-btn pd-icon-edit"
                                                                onClick={() =>
                                                                    editInvoice(
                                                                        appointmentId,
                                                                        visit,
                                                                    )
                                                                }
                                                            >
                                                                <Pencil
                                                                    size={13}
                                                                />
                                                            </button>

                                                            <button
                                                                className="pd-icon-btn pd-icon-del danger"
                                                                onClick={() =>
                                                                    deleteInvoice(
                                                                        appointmentId,
                                                                        visit,
                                                                    )
                                                                }
                                                            >
                                                                <Trash2
                                                                    size={13}
                                                                />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <div className="pd-mob-table">
                                    {appointmentsForView.map((visit) => (
                                        <div
                                            key={visit._id}
                                            className="pd-visit-card"
                                        >
                                            <div className="pd-visit-row">
                                                <div>
                                                    <div className="pd-visit-date">
                                                        {visit.formattedDate}
                                                    </div>
                                                    {visit.time && (
                                                        <div className="pd-visit-time">
                                                            {formatTime(
                                                                visit.time,
                                                            )}
                                                        </div>
                                                    )}
                                                    <div
                                                        style={{
                                                            fontSize: 11,
                                                            color: "#6b7fa8",
                                                            marginTop: 4,
                                                        }}
                                                    >
                                                        {(visit.service || [])
                                                            .map((s) => s.name)
                                                            .join(", ")}
                                                    </div>
                                                </div>
                                                <div
                                                    style={{
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    <div className="pd-visit-amount">
                                                        <IndianRupee
                                                            size={13}
                                                        />
                                                        {fmt(visit.amount ?? 0)}
                                                    </div>
                                                    {Number(
                                                        visit.collected ?? 0,
                                                    ) <
                                                        Number(
                                                            visit.amount ?? 0,
                                                        ) && (
                                                        <div className="pd-visit-sub">
                                                            Collected{" "}
                                                            <IndianRupee
                                                                size={11}
                                                            />
                                                            {fmt(
                                                                visit.collected ||
                                                                    0,
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="pd-visit-footer">
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: 6,
                                                        flexWrap: "wrap",
                                                        alignItems: "center",
                                                    }}
                                                >
                                                    <span
                                                        className={`pl-tag pl-${(visit.payment_type || "other").toLowerCase()}`}
                                                    >
                                                        {visit.payment_type ||
                                                            "N/A"}
                                                    </span>
                                                    {(() => {
                                                        const col = Number(
                                                                visit.collected ??
                                                                    0,
                                                            ),
                                                            tot = Number(
                                                                visit.amount ??
                                                                    0,
                                                            ),
                                                            rem = tot - col;
                                                        const s =
                                                            rem <= 0
                                                                ? "Paid"
                                                                : col > 0
                                                                  ? "Partial"
                                                                  : "Unpaid";
                                                        return (
                                                            <span
                                                                className={`pl-status ${statusClass(s)}`}
                                                            >
                                                                {s}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="pd-visit-actions">
                                                    <button
                                                        className="pd-icon-btn pd-icon-inv"
                                                        onClick={() =>
                                                            handleInvoiceClick(
                                                                id,
                                                                visit,
                                                                details,
                                                            )
                                                        }
                                                    >
                                                        <ReceiptIndianRupee
                                                            size={13}
                                                        />
                                                    </button>
                                                    <button
                                                        className="pd-icon-btn pd-icon-edit"
                                                        onClick={() =>
                                                            editInvoice(
                                                                appointmentId,
                                                                visit,
                                                            )
                                                        }
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        className="pd-icon-btn pd-icon-del"
                                                        onClick={() =>
                                                            deleteInvoice(
                                                                appointmentId,
                                                                visit,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )
                    ) : (
                        /* ================= IMAGE VIEW ================= */
                        <>
                            {patientImages.length === 0 ? (
                                <div className="pd-gallery-empty">
                                    <ImageIcon
                                        size={14}
                                        style={{ opacity: 0.3 }}
                                    />
                                    No records available
                                </div>
                            ) : (
                                <div className="pd-image-grid">
                                    {patientImages.map((img, i) => (
                                        <div
                                            key={i}
                                            className="pd-image-item"
                                            onClick={() => setLightboxImg(img)}
                                        >
                                            <img src={img.url} alt="record" />
                                            <div className="pd-image-overlay">
                                                {img.date}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
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
                        alt="patient"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="pd-lightbox-date">{lightboxImg.date}</div>
                </div>
            )}

            {/* Edit Appointment Modal */}
            {editApptOpen && (
                <div
                    className="pd-modal-bg"
                    onClick={() => {
                        setEditApptOpen(false);
                        setShowCalendar(false);
                    }}
                >
                    <div
                        className="pd-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="pd-modal-header">
                            <div className="pd-modal-title">
                                Edit <em>Appointment</em>
                            </div>
                            <button
                                className="pd-modal-close"
                                onClick={() => {
                                    setEditApptOpen(false);
                                    setShowCalendar(false);
                                }}
                            >
                                <X size={13} />
                            </button>
                        </div>
                        <div className="pd-modal-body">
                            {/* Date toggle */}
                            <div className="pd-field">
                                <label className="pd-label">Date *</label>
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
                                        style={{
                                            fontSize: 10,
                                            color: "#2e3d5c",
                                        }}
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

                            {editingAppt && (
                                <div className="pd-current-slot">
                                    {apptData.time
                                        ? formatTime(apptData.time)
                                        : "No time selected"}
                                </div>
                            )}

                            {Object.entries(groupedSlots).map(
                                ([label, slots]) =>
                                    slots.length ? (
                                        <div
                                            key={label}
                                            className="pd-slot-accordion"
                                        >
                                            <div
                                                className={`pd-slot-hdr ${openSection === label ? "open" : ""}`}
                                                onClick={() =>
                                                    setOpenSection((p) =>
                                                        p === label
                                                            ? null
                                                            : label,
                                                    )
                                                }
                                            >
                                                <span>{label}</span>
                                                <span style={{ fontSize: 14 }}>
                                                    {openSection === label
                                                        ? "−"
                                                        : "+"}
                                                </span>
                                            </div>
                                            {openSection === label && (
                                                <div className="pd-slot-grid">
                                                    {slots
                                                        .filter((slot) => {
                                                            const isBooked =
                                                                bookedSlots.includes(
                                                                    slot,
                                                                );
                                                            return (
                                                                !isBooked ||
                                                                apptData.time ===
                                                                    slot
                                                            );
                                                        })
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
                                                                className={`pd-slot ${apptData.time === slot ? "selected" : ""} ${bookedSlots.includes(slot) ? "booked" : ""}`}
                                                                onClick={() =>
                                                                    setApptData(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            time: slot,
                                                                        }),
                                                                    )
                                                                }
                                                            >
                                                                {formatTime(
                                                                    slot,
                                                                )}
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : null,
                            )}

                            <div className="pd-section-sep">
                                Services & Billing *
                            </div>
                            <ServiceList
                                services={availableServices}
                                selectedServices={apptData.service}
                                onAdd={(s) =>
                                    setApptData((prev) =>
                                        prev.service.some(
                                            (x) => x._id === s._id,
                                        )
                                            ? prev
                                            : {
                                                  ...prev,
                                                  service: [...prev.service, s],
                                              },
                                    )
                                }
                                onRemove={(id) =>
                                    setApptData((prev) => ({
                                        ...prev,
                                        service: prev.service.filter(
                                            (s) => s._id !== id,
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
                                                <span
                                                    style={{ color: "#c5d0e8" }}
                                                >
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
                                                    <IndianRupee size={12} />
                                                    <input
                                                        type="number"
                                                        className="pd-amount-input"
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
                                                <IndianRupee size={11} />
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
                                                    − <IndianRupee size={11} />
                                                    {fmt(
                                                        serviceTotal -
                                                            finalAmount,
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
                                                <IndianRupee size={12} />
                                                {fmt(finalAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}

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
                                    className={`pd-percent-toggle ${isPercent ? "on" : ""}`}
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

                            <div className="pd-section-sep">Collection</div>
                            <div className="pd-collected-row">
                                <span
                                    style={{ color: "#c5d0e8", fontSize: 11 }}
                                >
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
                                    <IndianRupee size={12} />
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
                                                Remaining:{" "}
                                                <IndianRupee
                                                    size={11}
                                                    style={{
                                                        display: "inline",
                                                    }}
                                                />
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

                            <div className="pd-field">
                                <label className="pd-label">
                                    Payment Type *
                                </label>
                                <select
                                    className="pd-select"
                                    value={apptData.payment_type}
                                    onChange={(e) =>
                                        setApptData((prev) => ({
                                            ...prev,
                                            payment_type: e.target.value,
                                        }))
                                    }
                                >
                                    <option value="">Select Payment</option>
                                    <option>Cash</option>
                                    <option>Card</option>
                                    <option>SBI</option>
                                    <option>ICICI</option>
                                    <option>HDFC</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div className="pd-modal-footer">
                            <button
                                className="pd-btn pd-btn-outline"
                                onClick={() => {
                                    setEditApptOpen(false);
                                    setShowCalendar(false);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="pd-btn pd-btn-primary"
                                onClick={() => {
                                    const error = validateForm();
                                    if (error) {
                                        props.showAlert(error, "warning");
                                        return;
                                    }
                                    handleUpdateAppt();
                                }}
                            >
                                <Check size={13} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Patient Modal */}
            {editPatientOpen && (
                <div
                    className="pd-modal-bg"
                    onClick={() => setEditPatientOpen(false)}
                >
                    <div
                        className="pd-modal pd-modal-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="pd-modal-header">
                            <div className="pd-modal-title">
                                Edit <em>Patient</em>
                            </div>
                            <button
                                className="pd-modal-close"
                                onClick={() => setEditPatientOpen(false)}
                            >
                                <X size={13} />
                            </button>
                        </div>
                        <div className="pd-modal-body">
                            <div className="pd-field">
                                <label className="pd-label">Name</label>
                                <input
                                    className="pd-input"
                                    type="text"
                                    name="name"
                                    value={patient.name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">
                                    Mobile Number
                                </label>
                                <input
                                    className="pd-input"
                                    type="text"
                                    name="number"
                                    value={patient.number}
                                    onChange={handleChange}
                                    maxLength={10}
                                    minLength={10}
                                />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Age</label>
                                <input
                                    className="pd-input"
                                    type="number"
                                    name="age"
                                    value={patient.age}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="pd-field">
                                <label className="pd-label">Gender</label>
                                <select
                                    className="pd-select"
                                    name="gender"
                                    value={patient.gender}
                                    onChange={handleChange}
                                    style={{ marginBottom: 0 }}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>
                        <div className="pd-modal-footer">
                            <button
                                className="pd-btn pd-btn-outline"
                                onClick={() => {
                                    setEditPatientOpen(false);
                                    setPatient(details);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="pd-btn pd-btn-primary"
                                onClick={handleSave}
                            >
                                <Check size={13} /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
