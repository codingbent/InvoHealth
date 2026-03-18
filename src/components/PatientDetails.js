import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import ServiceList from "./ServiceList";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./authfetch";
import { toWords } from "number-to-words";
import {
    Pencil,
    Trash2,
    Loader2,
    UserRound,
    User,
    IndianRupee,
    Phone,
    ReceiptIndianRupee,
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
    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN").format(value);
    };

    // ------------------------------------------------------------
    // FETCH DOCTOR DETAILS
    // ------------------------------------------------------------
    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/doctor/get_doc`);
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        } catch (err) {
            console.error("Error fetching doctor:", err);
        }
    }, [API_BASE_URL]);

    // ------------------------------------------------------------
    // FETCH SERVICES
    // ------------------------------------------------------------
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
            console.error("Error fetching services:", err);
        }
    }, [API_BASE_URL]);

    const generateSlots = useCallback((start, end, duration) => {
        const step = duration || 15;
        const slots = [];

        let [h, m] = start.split(":").map(Number);
        let [endH, endM] = end.split(":").map(Number);

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
                    const currentTime =
                        today.getHours() * 60 + today.getMinutes();

                    allSlots = allSlots.filter((time) => {
                        const [h, m] = time.split(":").map(Number);
                        return h * 60 + m > currentTime;
                    });
                }

                const finalSlots = allSlots.filter(
                    (slot) => !booked.includes(slot),
                );

                setTimeSlots(finalSlots);
            } catch (err) {
                console.error(err);
            }
        },
        [availability, API_BASE_URL, generateSlots],
    );

    const allSlotsWithSelected = useMemo(() => {
        if (!apptData.time) return timeSlots;

        if (!timeSlots.includes(apptData.time)) {
            return [apptData.time, ...timeSlots];
        }

        return timeSlots;
    }, [timeSlots, apptData.time]);

    const groupedSlots = useMemo(() => {
        const groups = {
            Morning: [],
            Afternoon: [],
            Evening: [],
        };

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
        ) {
            setApptData((prev) => ({
                ...prev,
                time: "",
            }));
        }
    }, [timeSlots, apptData.time, editingAppt]);

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
                {
                    method: "DELETE",
                },
            );

            const data = await res.json();

            if (data.success) {
                props.showAlert("Patient deleted successfully", "success");
                navigate("/");
            } else {
                alert(data.message || "Failed to delete patient");
            }
        } catch (err) {
            console.error(err);
            alert("Server error while deleting patient");
        } finally {
            setDeleting(false);
        }
    };

    // ------------------------------------------------------------
    // FETCH PATIENT + APPOINTMENTS
    // ------------------------------------------------------------
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
            console.error("Error fetching patient:", err);
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

        let discountValue = 0;
        if (discount > 0) {
            discountValue = isPercent ? total * (discount / 100) : discount;
        }

        if (discountValue > total) discountValue = total;
        if (discountValue < 0) discountValue = 0;

        setFinalAmount(Math.round((total - discountValue) * 100) / 100);
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

    // ------------------------------------------------------------
    // UPDATE PATIENT DETAILS
    // ------------------------------------------------------------
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
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(patient),
                },
            );

            const result = await response.json();
            if (response.ok) {
                props.showAlert("Patient updated successfully", "success");
                setDetails((prev) => ({ ...prev, ...patient }));
            } else {
                alert(result.message || "Update failed");
            }
        } catch (err) {
            console.error(err);
            alert("Server error");
        }
    };

    const sortedAppointments = useMemo(() => {
        return [...appointments].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
            const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
            return dateB - dateA;
        });
    }, [appointments]);

    const serviceTotal = useMemo(() => {
        return apptData.service.reduce(
            (sum, s) => sum + (serviceAmounts[s._id] ?? s.amount ?? 0),
            0,
        );
    }, [apptData.service, serviceAmounts]);

    const appointmentsForView = useMemo(() => {
        return sortedAppointments.map((visit) => ({
            ...visit,
            formattedDate: new Date(visit.date).toLocaleDateString("en-IN"),
        }));
    }, [sortedAppointments]);

    useEffect(() => {
        if (editingAppt && finalAmount > 0) {
            setCollected(initialCollected);
        }
    }, [finalAmount, editingAppt, initialCollected]);
    // ------------------------------------------------------------
    // INVOICE GENERATOR
    // ------------------------------------------------------------

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
                const confirmDownload = window.confirm(
                    "⚠ This is your LAST invoice download for this plan.\n\nDo you want to continue?",
                );

                if (!confirmDownload) return;
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

            const margin = 20;
            const invoiceNumber = visit.invoiceNumber || "N/A";
            const docPdf = new jsPDF();
            const pageWidth = docPdf.internal.pageSize.getWidth();

            let leftY = 20;
            let rightY = 20;

            // ================= HEADER =================
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
                `Patient: ${details.name} | Age: ${details.age || "N/A"} | Gender: ${
                    details.gender || "N/A"
                }`,
                margin,
                leftY,
            );
            leftY += 6;

            // ================= RIGHT SIDE INFO =================
            docPdf.setFontSize(11);

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
                    {
                        align: "right",
                    },
                );
                rightY += 5;
            }

            docPdf.text(
                `Date: ${visit.formattedDate}`,
                pageWidth - margin,
                rightY,
                {
                    align: "right",
                },
            );

            // ================= BILL CALCULATION =================
            const services = visit.service || [];

            const baseAmount = services.reduce(
                (sum, s) => sum + Number(s.amount || 0),
                0,
            );

            let discountValue = 0;
            let finalAmount = baseAmount;

            if (includeDiscount && visit.discount > 0) {
                discountValue = visit.isPercent
                    ? (baseAmount * visit.discount) / 100
                    : visit.discount;

                if (discountValue > baseAmount) discountValue = baseAmount;
                if (discountValue < 0) discountValue = 0;

                finalAmount = baseAmount - discountValue;
            }

            // ================= PAYMENT STATUS =================
            const collectedAmount = Number(visit.collected ?? finalAmount);

            const remainingAmount = finalAmount - collectedAmount;

            const paymentStatus =
                remainingAmount <= 0
                    ? "Paid"
                    : collectedAmount > 0
                      ? "Partial"
                      : "Unpaid";

            // ================= TABLE ROWS =================
            const tableRows = services.map((s) => [
                s.name,
                `Rs ${formatCurrency(s.amount)}`,
            ]);
            tableRows.push([
                "TOTAL AMOUNT",
                `Rs ${formatCurrency(finalAmount)}`,
            ]);

            if (includeDiscount && visit.discount > 0) {
                tableRows.push([
                    `Discount ${
                        visit.isPercent
                            ? `(${visit.discount}%)`
                            : `(Rs ${visit.discount})`
                    }`,
                    `- Rs ${formatCurrency(discountValue)}`,
                ]);
            }

            // Payment breakdown
            tableRows.push([
                "Collected",
                `Rs ${formatCurrency(collectedAmount)}`,
            ]);
            if (remainingAmount !== 0) {
                tableRows.push([
                    "Payable Amount",
                    `Rs ${formatCurrency(remainingAmount)}`,
                ]);
            }
            tableRows.push(["Status", paymentStatus]);

            // ================= TABLE =================
            const tableStartY = leftY + 4;

            autoTable(docPdf, {
                startY: tableStartY,
                head: [["Service", "Amount"]],
                body: tableRows,
                theme: "grid",
                styles: { fontSize: 11, cellPadding: 3 },
                headStyles: {
                    fillColor: [60, 60, 60],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                },
                didParseCell: function (data) {
                    if (data.row.index >= tableRows.length - 4) {
                        data.cell.styles.fontStyle = "bold";
                    }
                },
            });

            // ================= AMOUNT IN WORDS =================
            const roundedAmount = Math.round(finalAmount);
            let y = docPdf.lastAutoTable.finalY + 8;

            const amountInWords = `Rupees ${toWords(
                roundedAmount,
            )} Only`.replace(/\b\w/g, (c) => c.toUpperCase());

            docPdf.setFontSize(11);
            docPdf.setFont(undefined, "bold");
            docPdf.text("Amount in Words:", margin, y);

            docPdf.setFont(undefined, "normal");
            docPdf.text(amountInWords, margin + 40, y);

            y += 8;

            // ================= FOOTER MESSAGE =================
            let receiptText = "";

            if (paymentStatus === "Paid") {
                receiptText = `Received with thanks from ${details.name} the sum of Rupees ${formatCurrency(collectedAmount)} only towards full settlement.`;
            } else if (paymentStatus === "Partial") {
                receiptText = `Part payment of Rupees ${formatCurrency(collectedAmount)} received from ${details.name}. Remaining amount of Rupees ${formatCurrency(remainingAmount)} is pending.`;
            } else {
                receiptText = `Total amount of Rupees ${formatCurrency(finalAmount)} is pending from ${details.name}.`;
            }

            docPdf.setFontSize(11);
            docPdf.text(receiptText, margin, y, {
                maxWidth: pageWidth - margin * 2,
            });

            y += 12;

            // ================= SIGNATURE =================
            docPdf.setFontSize(15);
            docPdf.text(doctor.name, pageWidth - margin, y, {
                align: "right",
            });

            y += 6;

            docPdf.setFontSize(12);
            docPdf.text("Signature", pageWidth - margin, y, {
                align: "right",
            });

            // ================= SAVE =================
            docPdf.save(`Invoice_${details.name}.pdf`);
        } catch (err) {
            console.error(err);
        }
    };

    const editInvoice = async (appointmentId, visit) => {
        setEditingAppt({
            appointmentId,
            _id: visit._id,
        });

        const normalizedServices = (visit.service || []).map((s) => {
            const realService = availableServices.find(
                (as) => as._id === (s._id || s.id),
            );

            return {
                _id: realService?._id || s._id || s.id,
                name: s.name,
                amount: s.amount ?? realService?.amount ?? 0,
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

        // rest unchanged
        const amountMap = {};
        normalizedServices.forEach((s) => {
            amountMap[s._id] = s.amount || 0;
        });

        setServiceAmounts(amountMap);
        setDiscount(visit.discount || 0);
        setIsPercent(!!visit.isPercent);
        setInitialCollected(visit.collected || 0);

        document.getElementById("editAppointmentModalBtn").click();
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
                    headers: {
                        "Content-Type": "application/json",
                    },
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
                fetchData();
                window.location.reload();
            } else {
                alert("Update failed: " + data.message);
            }
        } catch (err) {
            console.error("Edit invoice error:", err);
            alert("Server error");
        }
    };

    const deleteInvoice = async (appointmentId, visit) => {
        if (!window.confirm("Delete this Appointment?")) return;

        const response = await authFetch(
            `${API_BASE_URL}/api/doctor/appointment/delete_appointment/${appointmentId}/${visit._id}`,
            {
                method: "DELETE",
            },
        );

        const data = await response.json();

        if (data.success) {
            alert("Invoice deleted!");
            fetchData();
        } else {
            alert("Delete failed: " + data.message);
        }
    };

    useEffect(() => {
        if (!editingAppt) return;

        setCollected((prev) => {
            if (prev > finalAmount) {
                return finalAmount;
            }

            return prev;
        });
    }, [editingAppt, finalAmount]);

    useEffect(() => {
        if (isFullPaid) {
            setCollected(finalAmount);
        }
    }, [isFullPaid, finalAmount]);

    if (loading)
        return (
            <div className="d-flex flex-column justify-content-center align-items-center py-5">
                <div
                    className="spinner-border text-primary mb-3"
                    role="status"
                />
                <span className="text-theme-secondary">
                    Loading patient details…
                </span>
            </div>
        );

    return (
        <>
            {/* Hidden button to trigger edit appointment modal */}
            <button
                id="editAppointmentModalBtn"
                className="d-none"
                data-bs-toggle="modal"
                data-bs-target="#editAppointmentModal"
            />

            <div className="container my-4">
                <div className="card shadow-sm border-0 rounded-4">
                    <div className="card-body">
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div className="d-flex align-items-center gap-3">
                                <div className="avatar-circle d-flex align-items-center justify-content-center">
                                    {details?.gender === "Female" ? (
                                        <UserRound size={20} />
                                    ) : (
                                        <User size={20} />
                                    )}
                                </div>
                                <div>
                                    <h5 className="fw-semibold mb-0">
                                        {details?.name}
                                    </h5>
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="row g-3 mb-4">
                            <div className="col-6 col-md-4">
                                <div className="info-box">
                                    <span className="label">Age: </span>
                                    <span className="value">
                                        {details?.age}
                                    </span>
                                </div>
                            </div>

                            <div className="col-6 col-md-4">
                                <div className="info-box">
                                    <span className="label">Gender: </span>
                                    <span className="value">
                                        {details?.gender || "N/A"}
                                    </span>
                                </div>
                            </div>

                            <div className="col-6 col-md-4">
                                <div className="info-box">
                                    <span className="label">Contact:</span>

                                    <a
                                        href={`tel:${details?.number}`}
                                        className="value text-decoration-none d-flex align-items-center gap-1 mt-1 contact-text"
                                    >
                                        <span className="text-truncate">
                                            {details?.number}
                                        </span>
                                        <Phone size={14} />
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="d-flex gap-2 justify-content-end">
                            <button
                                className="btn btn-primary rounded-pill px-4"
                                data-bs-toggle="modal"
                                data-bs-target="#editPatientModal"
                            >
                                <Pencil size={20} strokeWidth={2} />
                                Edit Patient
                            </button>

                            <button
                                className="btn btn-outline-danger rounded-pill px-4 d-flex align-items-center gap-2"
                                disabled={deleting}
                                onClick={handleDeletePatient}
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 size={16} className="spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-5 previous-section">
                    <h5 className="fw-semibold mb-3">Previous Appointments</h5>

                    <div className="d-none d-md-block">
                        {appointments.length === 0 ? (
                            <div className="text-theme-secondary">
                                No appointments found
                            </div>
                        ) : (
                            <table className="table table-theme align-middle table-hover">
                                <thead>
                                    <tr>
                                        <th className="text-theme-secondary">
                                            Date
                                        </th>
                                        <th className="text-theme-secondary">
                                            Services
                                        </th>
                                        <th className="text-theme-secondary">
                                            Amount
                                        </th>
                                        <th className="text-theme-secondary">
                                            Status
                                        </th>
                                        <th className="text-theme-secondary">
                                            Payment
                                        </th>
                                        <th className="text-end text-theme-secondary">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {appointmentsForView.map((visit) => (
                                        <tr key={visit._id}>
                                            <td className="text-theme-primary">
                                                <div>
                                                    <strong>
                                                        {visit.formattedDate}
                                                    </strong>

                                                    {visit.time && (
                                                        <div className="small text-theme-secondary">
                                                            {formatTime(
                                                                visit.time,
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="text-theme-primary">
                                                {(visit.service || [])
                                                    .map((s) => s.name)
                                                    .join(", ")}
                                            </td>

                                            <td className="fw-semibold text-theme-primary">
                                                <IndianRupee size={18} />
                                                {formatCurrency(
                                                    visit.collected ??
                                                        visit.amount ??
                                                        0,
                                                )}
                                            </td>
                                            <td>
                                                {(() => {
                                                    const collected = Number(
                                                        visit.collected ?? 0,
                                                    );
                                                    const total = Number(
                                                        visit.amount ?? 0,
                                                    );
                                                    const remaining =
                                                        total - collected;

                                                    const status =
                                                        remaining <= 0
                                                            ? "Paid"
                                                            : collected > 0
                                                              ? "Partial"
                                                              : "Unpaid";

                                                    const badgeClass =
                                                        status === "Paid"
                                                            ? "status-paid"
                                                            : status ===
                                                                "Partial"
                                                              ? "status-partial"
                                                              : "status-unpaid";

                                                    return (
                                                        <span
                                                            className={`status-badge ${badgeClass}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <span
                                                    className={`payment-tag ${
                                                        visit.payment_type
                                                            ? `payment-${visit.payment_type}`
                                                            : "payment-other"
                                                    }`}
                                                >
                                                    {visit.payment_type ||
                                                        "N/A"}
                                                </span>
                                            </td>

                                            <td className="text-end">
                                                <div className="d-flex justify-content-end gap-2">
                                                    <button
                                                        className="btn btn-sm btn-outline-theme"
                                                        onClick={() =>
                                                            handleInvoiceClick(
                                                                id,
                                                                visit,
                                                                details,
                                                            )
                                                        }
                                                    >
                                                        Invoice
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-outline-theme"
                                                        onClick={() =>
                                                            editInvoice(
                                                                appointmentId,
                                                                visit,
                                                            )
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        className="btn btn-sm btn-outline-theme text-danger-theme"
                                                        onClick={() =>
                                                            deleteInvoice(
                                                                appointmentId,
                                                                visit,
                                                            )
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            <div className="d-block d-md-none mt-3">
                {appointmentsForView.map((visit) => (
                    <div
                        key={visit._id}
                        className="card mb-3 shadow-sm rounded-4"
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="text-theme-primary">
                                    <div className="d-flex flex-column">
                                        <span>{visit.formattedDate}</span>

                                        {visit.time && (
                                            <small className="text-theme-secondary">
                                                {formatTime(visit.time)}
                                            </small>
                                        )}
                                    </div>
                                </div>

                                <div className="text-end">
                                    {Number(visit.collected ?? 0) >=
                                    Number(visit.amount ?? 0) ? (
                                        <div className="fw-semibold text-success">
                                            <IndianRupee size={18} />
                                            {formatCurrency(visit.amount)}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="fw-semibold text-theme-primary">
                                                <IndianRupee size={18} />
                                                {formatCurrency(visit.amount)}
                                            </div>

                                            <small className="text-theme-secondary d-block">
                                                Collected:{" "}
                                                <IndianRupee size={18} />
                                                {visit.collected || 0}
                                            </small>
                                            <small className="text-danger d-block">
                                                Remaining:{" "}
                                                <IndianRupee size={18} />
                                                {formatCurrency(
                                                    Number(visit.amount ?? 0) -
                                                        Number(
                                                            visit.collected ??
                                                                0,
                                                        ),
                                                )}
                                            </small>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex justify-content-between align-items-start mb-2">
                                <p className="text-theme-secondary mb-1 me-2">
                                    {(visit.service || [])
                                        .map((s) => s.name)
                                        .join(", ")}
                                </p>

                                <span
                                    className={`status-badge ${
                                        visit.status === "Paid"
                                            ? "status-paid"
                                            : visit.status === "Partial"
                                              ? "status-partial"
                                              : "status-unpaid"
                                    }`}
                                >
                                    {visit.status}
                                </span>
                            </div>

                            <span className="badge bg-secondary-subtle text-secondary mb-3">
                                {visit.payment_type || "N/A"}
                            </span>

                            <div className="d-flex flex-row flex-md-row gap-2">
                                <button
                                    className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center gap-1"
                                    onClick={() =>
                                        handleInvoiceClick(id, visit, details)
                                    }
                                >
                                    <ReceiptIndianRupee size={18} /> Invoice
                                </button>

                                <button
                                    className="btn btn-outline-warning w-100 d-flex align-items-center justify-content-center gap-1"
                                    onClick={() =>
                                        editInvoice(appointmentId, visit)
                                    }
                                >
                                    <Pencil size={18} />
                                    Edit
                                </button>

                                <button
                                    className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-1"
                                    onClick={() =>
                                        deleteInvoice(appointmentId, visit)
                                    }
                                >
                                    <Trash2 size={18} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ================= EDIT APPOINTMENT MODAL ================= */}
            <div
                className="modal fade"
                id="editAppointmentModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit Appointment</h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body pt-3">
                            {/* DATE */}
                            <div className="mb-4">
                                <label className="form-label small">
                                    Date <span className="text-danger">*</span>
                                </label>{" "}
                                <input
                                    type="date"
                                    className="form-control rounded-3"
                                    value={apptData.date}
                                    onChange={(e) =>
                                        setApptData((prev) => ({
                                            ...prev,
                                            date: e.target.value,
                                            time: "",
                                        }))
                                    }
                                />
                            </div>
                            {/* TIME SLOT */}
                            <div className="mb-4">
                                {editingAppt && (
                                    <div className="mb-3">
                                        <label className="form-label small">
                                            Time Slot{" "}
                                            <span className="text-danger">
                                                *
                                            </span>
                                        </label>
                                        <div className="current-slot-box">
                                            {apptData.time
                                                ? formatTime(apptData.time)
                                                : "No time selected"}
                                        </div>
                                    </div>
                                )}
                                {Object.entries(groupedSlots).map(
                                    ([label, slots]) =>
                                        slots.length ? (
                                            <div
                                                key={label}
                                                className="accordion-slot"
                                            >
                                                {/* HEADER */}
                                                <div
                                                    className="accordion-header"
                                                    onClick={() =>
                                                        setOpenSection(
                                                            (prev) =>
                                                                prev === label
                                                                    ? null
                                                                    : label,
                                                        )
                                                    }
                                                >
                                                    <span>{label}</span>
                                                    <span>
                                                        {openSection === label
                                                            ? "-"
                                                            : "+"}
                                                    </span>
                                                </div>

                                                {/* CONTENT */}
                                                {openSection === label && (
                                                    <div className="slot-grid">
                                                        {slots
                                                            .filter((slot) => {
                                                                const isBooked =
                                                                    bookedSlots.includes(
                                                                        slot,
                                                                    );
                                                                const isSameSlot =
                                                                    apptData.time ===
                                                                    slot;

                                                                // ✅ keep current slot in edit mode
                                                                return (
                                                                    !isBooked ||
                                                                    isSameSlot
                                                                );
                                                            })
                                                            .map((slot) => {
                                                                const isBooked =
                                                                    bookedSlots.includes(
                                                                        slot,
                                                                    );
                                                                const isSelected =
                                                                    apptData.time ===
                                                                    slot;
                                                                const isSameSlot =
                                                                    apptData.time ===
                                                                    slot;

                                                                return (
                                                                    <button
                                                                        key={
                                                                            slot
                                                                        }
                                                                        type="button"
                                                                        disabled={
                                                                            isBooked &&
                                                                            !isSameSlot
                                                                        }
                                                                        className={`slot-btn 
                                        ${isSelected ? "selected" : ""} 
                                        ${isBooked ? "booked" : ""}`}
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
                                                                );
                                                            })}
                                                    </div>
                                                )}
                                            </div>
                                        ) : null,
                                )}
                            </div>

                            {/* SERVICES */}
                            <h6 className="text-uppercase text-theme-secondary small mb-2">
                                Services & Billing{" "}
                                <span className="text-danger">*</span>
                            </h6>

                            <div className="mb-3">
                                <ServiceList
                                    services={availableServices}
                                    selectedServices={apptData.service}
                                    onAdd={(service) => {
                                        setApptData((prev) =>
                                            prev.service.some(
                                                (s) => s._id === service._id,
                                            )
                                                ? prev
                                                : {
                                                      ...prev,
                                                      service: [
                                                          ...prev.service,
                                                          service,
                                                      ],
                                                  },
                                        );
                                    }}
                                    onRemove={(id) => {
                                        setApptData((prev) => ({
                                            ...prev,
                                            service: prev.service.filter(
                                                (s) => s._id !== id,
                                            ),
                                        }));
                                    }}
                                />
                            </div>

                            {/* SERVICES TABLE */}
                            {apptData.service.length > 0 && (
                                <div
                                    className="rounded-4 p-3 mb-4"
                                    style={{
                                        background: "rgba(255,255,255,0.02)",
                                    }}
                                >
                                    {" "}
                                    <table className="table table-sm align-middle mb-3 clean-table">
                                        <thead>
                                            <tr>
                                                <th className="text-white">Service</th>
                                                <th className="text-end text-white">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {apptData.service.map((s) => (
                                                <tr className="clean-row" key={s._id}>
                                                    <td className="service-name">
                                                        {s.name}
                                                    </td>

                                                    <td className="text-end">
                                                        <div className="amount-input-wrapper text-white">
                                                            <IndianRupee
                                                                size={14}
                                                            />
                                                            <input
                                                                type="number"
                                                                className="amount-input"
                                                                value={
                                                                    serviceAmounts[
                                                                        s._id
                                                                    ] ??
                                                                    s.amount
                                                                }
                                                                onChange={(e) =>
                                                                    setServiceAmounts(
                                                                        (
                                                                            prev,
                                                                        ) => ({
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
                                    <div className="final-amount-box">
                                        <span>Total</span>
                                        <span className="text-primary fw-bold">
                                            {<IndianRupee size={18} />}
                                            {formatCurrency(serviceTotal)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* DISCOUNT */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="fw-semibold">
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
                                            {isPercent
                                                ? "Percentage (%)"
                                                : "Flat Amount ₹"}
                                        </label>
                                    </div>
                                </div>

                                <input
                                    type="number"
                                    className="form-control rounded-3"
                                    value={discount}
                                    onChange={(e) =>
                                        setDiscount(Number(e.target.value))
                                    }
                                />

                                <div className="d-flex justify-content-between mt-2 text-danger small">
                                    <span>Discount Applied</span>
                                    <span>
                                        <IndianRupee size={16} />{" "}
                                        {formatCurrency(
                                            serviceTotal - finalAmount,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* PAYMENT SECTION */}
                            <div className="amount-collect-wrapper mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="fw-semibold">
                                        Amount Collected{" "}
                                        {isFullPaid && "(Auto)"}
                                    </span>

                                    <div className="amount-input-wrapper">
                                        <IndianRupee size={14} />
                                        <input
                                            type="number"
                                            className="amount-input"
                                            value={collected}
                                            disabled={isFullPaid}
                                            onChange={(e) => {
                                                const val = Number(
                                                    e.target.value,
                                                );
                                                setCollected(val);

                                                if (val !== finalAmount) {
                                                    setIsFullPaid(false);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="form-check mt-2">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={isFullPaid}
                                        onChange={(e) =>
                                            setIsFullPaid(e.target.checked)
                                        }
                                    />
                                    <label className="form-check-label small">
                                        Collect full payable amount
                                        automatically
                                    </label>
                                </div>
                            </div>

                            {/* STATUS */}
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <small className="text-theme-secondary">
                                        Remaining
                                    </small>
                                    <div className="fw-bold text-warning">
                                        ₹{" "}
                                        {formatCurrency(
                                            finalAmount - collected,
                                        )}
                                    </div>
                                </div>

                                {finalAmount > 0 &&
                                    (() => {
                                        const remaining = Math.max(
                                            finalAmount - collected,
                                            0,
                                        );

                                        const status =
                                            remaining === 0
                                                ? "Paid"
                                                : collected > 0
                                                  ? "Partial"
                                                  : "Unpaid";

                                        const badgeClass =
                                            status === "Paid"
                                                ? "bg-success"
                                                : status === "Partial"
                                                  ? "bg-warning text-dark"
                                                  : "bg-danger";

                                        return (
                                            <span
                                                className={`status-pill ${badgeClass}`}
                                            >
                                                {status}
                                            </span>
                                        );
                                    })()}
                            </div>

                            {/* FINAL */}
                            <div className="final-amount-box mb-4">
                                <span>Final Amount</span>
                                <span className="text-primary fw-bold">
                                    ₹ {formatCurrency(finalAmount)}
                                </span>
                            </div>

                            {/* PAYMENT TYPE */}
                            <div className="mb-3">
                                <label className="form-label small">
                                    Payment Type
                                    <span className="text-danger">*</span>
                                </label>
                                <select
                                    className="form-select rounded-3"
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

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Close
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    const error = validateForm();

                                    if (error) {
                                        props.showAlert(error, "warning");
                                        return;
                                    }

                                    handleUpdateAppt();
                                }}
                                // disabled={
                                //     !apptData.date ||
                                //     (timeSlots.length > 0 && !apptData.time) ||
                                //     !apptData.service.length
                                // }
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* ================= EDIT PATIENT MODAL ================= */}
            <div
                className="modal fade"
                id="editPatientModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                Edit Patient Details
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                            />
                        </div>

                        <div className="modal-body">
                            {/* NAME */}
                            <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    value={patient.name}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* MOBILE */}
                            <div className="mb-3">
                                <label className="form-label">
                                    Mobile Number
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="number"
                                    value={patient.number}
                                    onChange={handleChange}
                                    maxLength={10}
                                    minLength={10}
                                />
                            </div>

                            {/* AGE */}
                            <div className="mb-3">
                                <label className="form-label">Age</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    name="age"
                                    value={patient.age}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* GENDER */}
                            <div className="mb-3">
                                <label className="form-label">Gender</label>
                                <select
                                    className="form-select"
                                    name="gender"
                                    value={patient.gender}
                                    onChange={handleChange}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                                onClick={() => setPatient(details)}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={handleSave}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
