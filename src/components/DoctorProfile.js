import { useEffect, useState, useCallback, useMemo } from "react";
import { authFetch } from "./authfetch";
import {
    Pencil,
    Users,
    UserPlus,
    Phone,
    Trash2,
    Lock,
    RefreshCcw,
    TimerIcon,
    Eye,
    EyeOff,
    Plus,
    X,
    ChevronDown,
    ChevronUp,
    Check,
    AlertTriangle,
} from "lucide-react";

/* ── Password input sub-component ── */
const PasswordInput = ({
    label,
    placeholder,
    value,
    onChange,
    typeKey,
    showPasswords,
    setShowPasswords,
}) => {
    const isVisible = showPasswords[typeKey];
    return (
        <div className="dp-field">
            <label className="dp-label">{label}</label>
            <div style={{ position: "relative" }}>
                <input
                    type={isVisible ? "text" : "password"}
                    className="dp-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    style={{ paddingRight: 40 }}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    className="dp-eye-btn"
                    onClick={() =>
                        setShowPasswords((prev) => ({
                            ...prev,
                            [typeKey]: !prev[typeKey],
                        }))
                    }
                >
                    {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
        </div>
    );
};

/* ── Collapsible section ── */
const Section = ({ icon: Icon, title, children, accent = "#60a5fa" }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="dp-section">
            <button
                className="dp-section-header"
                onClick={() => setOpen((p) => !p)}
            >
                <span
                    className="dp-section-icon"
                    style={{ background: `${accent}15`, color: accent }}
                >
                    <Icon size={15} />
                </span>
                <span className="dp-section-title">{title}</span>
                {open ? (
                    <ChevronUp
                        size={14}
                        style={{ color: "#2e3d5c", marginLeft: "auto" }}
                    />
                ) : (
                    <ChevronDown
                        size={14}
                        style={{ color: "#2e3d5c", marginLeft: "auto" }}
                    />
                )}
            </button>
            {open && <div className="dp-section-body">{children}</div>}
        </div>
    );
};

export default function DoctorProfile(props) {
    const [doctor, setDoctor] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [staffName, setStaffName] = useState("");
    const [staffPhone, setStaffPhone] = useState("");
    const [staffRole, setStaffRole] = useState("");
    // eslint-disable-next-line
    const [subscription, setSubscription] = useState(null);
    // eslint-disable-next-line
    const [usage, setUsage] = useState(null);
    // eslint-disable-next-line
    const [staffCount, setStaffCount] = useState(0);
    const [pricing, setPricing] = useState(null);
    const [availability, setAvailability] = useState([]);
    const [editAvailability, setEditAvailability] = useState([]);
    const [selectedDays, setSelectedDays] = useState([]);
    const [tempSlots, setTempSlots] = useState([
        { startTime: "10:00", endTime: "15:00", slotDuration: 15 },
    ]);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [editStaffData, setEditStaffData] = useState({
        _id: "",
        name: "",
        phone: "",
        role: "",
    });
    const [editData, setEditData] = useState({});
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editStaffOpen, setEditStaffOpen] = useState(false);
    const [editAvailOpen, setEditAvailOpen] = useState(false);
    const [askedPhoneOnce, setAskedPhoneOnce] = useState(false);
    const [askedApptOnce, setAskedApptOnce] = useState(false);
    const [showPhone, setShowPhone] = useState(false);
    const [showApptPhone, setShowApptPhone] = useState(false);

    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );

    const passwordsMatch =
        passwordData.newPassword === passwordData.confirmPassword;

    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/doctor/get_doc`);
            const data = await res.json();
            if (!data.success) return;
            const doc = data.doctor;
            setDoctor(doc);
            setSubscription(doc.subscription || {});
            setUsage(doc.usage || {});
            setStaffCount(doc.staffCount || 0);
            setEditData({
                name: doc.name || "",
                email: doc.email || "",
                clinicName: doc.clinicName || "",
                phone: doc.phone || "",
                appointmentPhone: doc.appointmentPhone || "",
                regNumber: doc.regNumber || "",
                experience: doc.experience || "",
                degree: doc.degree?.length ? doc.degree : [""],
                address: {
                    line1: doc.address?.line1 || "",
                    line2: doc.address?.line2 || "",
                    line3: doc.address?.line3 || "",
                    city: doc.address?.city || "",
                    state: doc.address?.state || "",
                    pincode: doc.address?.pincode || "",
                },
            });
        } catch (err) {
            console.error("Fetch doctor error:", err);
        }
    }, [API_BASE_URL]);

    const fetchAvailability = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/timing/get_availability`,
            );
            const data = await res.json();
            if (data.success)
                setAvailability(data.availability || data.timings || []);
        } catch (err) {
            console.error("Fetch availability error:", err);
        }
    }, [API_BASE_URL]);

    const fetchStaff = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/staff/fetch_staff`,
            );
            const data = await res.json();
            setStaffCount(data.staff.length);
            if (data.success) setStaffList(data.staff);
        } catch (err) {
            console.error(err);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchDoctor();
        fetchStaff();
        fetchAvailability();
    }, [fetchDoctor, fetchStaff, fetchAvailability]);

    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/admin/pricing`);
                const data = await res.json();
                if (data.success) setPricing(data.pricing);
            } catch (err) {
                console.error(err);
            }
        };
        fetchPricing();
    }, [API_BASE_URL]);

    const handleEditChange = (e) =>
        setEditData({ ...editData, [e.target.name]: e.target.value });

    const handleAddressChange = (e) =>
        setEditData({
            ...editData,
            address: { ...editData.address, [e.target.name]: e.target.value },
        });

    const handleDegreeChange = (index, value) => {
        const u = [...editData.degree];
        u[index] = value;
        setEditData({ ...editData, degree: u });
    };

    const addDegreeField = () =>
        setEditData({ ...editData, degree: [...editData.degree, ""] });

    const removeDegreeField = (index) => {
        const u = [...editData.degree];
        u.splice(index, 1);
        setEditData({ ...editData, degree: u });
    };

    const handleSaveProfile = async () => {
        const cleanPhone = editData.phone?.replace(/\D/g, "");
        const cleanAppt = editData.appointmentPhone?.replace(/\D/g, "");

        if (cleanPhone && cleanPhone.length !== 10) {
            props.showAlert("Phone must be 10 digits", "warning");
            return;
        }

        if (cleanAppt && cleanAppt.length !== 10) {
            props.showAlert("Appointment phone must be 10 digits", "warning");
            return;
        }

        const payload = {
            ...editData,
            phone: cleanPhone,
            appointmentPhone: cleanAppt,
            degree: editData.degree.filter((d) => d.trim() !== ""),
        };
        const res = await authFetch(
            `${API_BASE_URL}/api/doctor/update_profile`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            },
        );
        const data = await res.json();
        if (data.success) {
            await fetchDoctor();
            setEditProfileOpen(false);
            props.showAlert("Profile updated successfully", "success");
        } else props.showAlert("Profile update failed", "danger");
    };

    const getPasswordStrength = (pw) => {
        if (pw.length < 6) return { label: "Weak", color: "#f87171" };
        if (pw.match(/[A-Z]/) && pw.match(/[0-9]/))
            return { label: "Strong", color: "#4ade80" };
        return { label: "Medium", color: "#fb923c" };
    };
    const strength = getPasswordStrength(passwordData.newPassword);

    const planKey = subscription?.plan?.toLowerCase();
    const staffLimit =
        planKey === "free" ? 1 : (pricing?.[planKey]?.staffLimit ?? 0);
    const isLimitReached = staffLimit !== -1 && staffCount >= staffLimit;

    const formatTime = (time) => {
        const [h, m] = time.split(":");
        let hour = parseInt(h);
        const ampm = hour >= 12 ? "PM" : "AM";
        hour = hour % 12 || 12;
        return `${hour}:${m} ${ampm}`;
    };

    const handleAddStaff = async () => {
        if (!staffName || !staffPhone || !staffRole) {
            props.showAlert("All fields required", "danger");
            return;
        }
        const res = await authFetch(
            `${API_BASE_URL}/api/doctor/staff/add_staff`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: staffName,
                    phone: staffPhone.replace(/\D/g, "").slice(-10),
                    role: staffRole,
                }),
            },
        );
        const data = await res.json();
        if (data.success) {
            fetchStaff();
            setStaffName("");
            setStaffPhone("");
            setStaffRole("");
        } else alert(data.error);
    };

    const updateDoctorPhone = useCallback(
        async (phone) => {
            try {
                // 🔥 normalize (remove spaces, symbols)
                const clean = phone.replace(/\D/g, "");

                // ❌ reject invalid
                if (clean.length !== 10) {
                    props.showAlert("Enter valid 10 digit number", "warning");
                    return;
                }

                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/update_profile`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ phone: clean }),
                    },
                );

                const data = await res.json();

                if (data.success) {
                    props.showAlert("Phone updated securely", "success");

                    // 🔥 IMPORTANT FIX (your previous bug)
                    await fetchDoctor(); // ✅ refresh decrypted data
                } else {
                    props.showAlert(data.error || "Update failed", "danger");
                }
            } catch (err) {
                console.error(err);
                props.showAlert("Server error", "danger");
            }
        },
        [API_BASE_URL, fetchDoctor, props],
    );

    useEffect(() => {
        if (doctor?.needsPhoneUpdate && !askedPhoneOnce) {
            setAskedPhoneOnce(true);

            let message = "⚠ Please enter your phone number:";

            if (doctor?.plainPhone) {
                message = `⚠ Please re-enter your phone number for security:\n\nOld number: ${doctor.plainPhone}\n\n(Sorry for inconvenience 🙏)`;
            }

            const phone = prompt(message, doctor?.plainPhone || "");

            if (phone && /^\d{10}$/.test(phone)) {
                updateDoctorPhone(phone);
            }
        }
    }, [doctor, askedPhoneOnce, updateDoctorPhone]);

    const updateDoctorAppointmentPhone = useCallback(
        async (appointmentPhone) => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/update_profile`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ appointmentPhone }),
                    },
                );

                const data = await res.json();

                if (data.success) {
                    props.showAlert("Appointment number secured", "success");
                    fetchDoctor();
                }
            } catch (err) {
                console.error(err);
            }
        },
        [API_BASE_URL, fetchDoctor, props],
    );

    useEffect(() => {
        if (doctor?.needsAppointmentPhoneUpdate && !askedApptOnce) {
            setAskedApptOnce(true);

            const phone = prompt(
                `⚠ Please re-enter appointment number:\n\nOld: ${doctor.plainAppointmentPhone}`,
                doctor?.plainAppointmentPhone || "",
            );

            if (phone && /^\d{10}$/.test(phone)) {
                updateDoctorAppointmentPhone(phone);
            }
        }
    }, [doctor, askedApptOnce, updateDoctorAppointmentPhone]);

    const handleChangePassword = async () => {
        const { currentPassword, newPassword, confirmPassword } = passwordData;
        if (!currentPassword || !newPassword || !confirmPassword) {
            props.showAlert("All fields required", "danger");
            return;
        }
        if (newPassword !== confirmPassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }
        const res = await authFetch(
            `${API_BASE_URL}/api/doctor/change_password`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            },
        );
        const data = await res.json();
        if (data.success) {
            props.showAlert("Password updated", "success");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setShowPasswords({ current: false, new: false, confirm: false });
            fetchAvailability();
        } else
            props.showAlert(
                data.error || "Server Error try again later",
                "danger",
            );
    };

    const deletestaff = async (staffId) => {
        const confirmDelete = window.confirm(
            "Do you want to delete this staff member?",
        );
        if (!confirmDelete) return;
        const res = await authFetch(
            `${API_BASE_URL}/api/doctor/staff/delete_staff/${staffId}`,
            { method: "DELETE" },
        );
        const data = await res.json();
        if (data.success) fetchStaff();
        else alert(data.error);
    };

    const openEditStaffModal = (staff) => {
        setEditStaffData({
            _id: staff._id,
            name: staff.name,
            phone: staff.phone,
            role: staff.role,
        });
        setEditStaffOpen(true);
    };

    const editstaff = async () => {
        const res = await authFetch(
            `${API_BASE_URL}/api/doctor/staff/edit_staff/${editStaffData._id}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editStaffData.name,
                    phone: editStaffData.phone,
                    role: editStaffData.role,
                }),
            },
        );
        const data = await res.json();
        if (data.success) {
            fetchStaff();
            setEditStaffOpen(false);
        } else alert(data.error);
    };

    if (!doctor)
        return (
            <>
                <div className="dp-root">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="dp-card dp-mb"
                            style={{ padding: 24 }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    gap: 14,
                                    alignItems: "center",
                                }}
                            >
                                <div
                                    className="dp-skeleton"
                                    style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: "50%",
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div
                                        className="dp-skeleton"
                                        style={{
                                            height: 12,
                                            width: "40%",
                                            marginBottom: 8,
                                            borderRadius: 4,
                                        }}
                                    />
                                    <div
                                        className="dp-skeleton"
                                        style={{
                                            height: 10,
                                            width: "25%",
                                            borderRadius: 4,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        );

    const ROLE_COLORS = {
        receptionist: {
            bg: "rgba(96,165,250,0.1)",
            border: "rgba(96,165,250,0.2)",
            color: "#60a5fa",
        },
        assistant: {
            bg: "rgba(167,139,250,0.1)",
            border: "rgba(167,139,250,0.2)",
            color: "#a78bfa",
        },
        nurse: {
            bg: "rgba(244,114,182,0.1)",
            border: "rgba(244,114,182,0.2)",
            color: "#f472b6",
        },
    };

    return (
        <>
            <div className="dp-root">
                {/* ── Profile Card ── */}
                <div className="dp-card dp-mb">
                    <div className="dp-profile-header">
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16,
                            }}
                        >
                            <div className="dp-avatar">
                                {doctor.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                                <div className="dp-doc-name">{doctor.name}</div>
                                <div className="dp-doc-clinic">
                                    {doctor.clinicName}
                                </div>
                            </div>
                        </div>
                        <button
                            className="dp-edit-btn"
                            onClick={() => setEditProfileOpen(true)}
                        >
                            <Pencil size={13} /> Edit Profile
                        </button>
                    </div>

                    <div className="dp-info-grid">
                        {[
                            {
                                label: "Contact",
                                value: (
                                    <>
                                        <div className="dp-row">
                                            <span className="dp-key">
                                                Email
                                            </span>
                                            <span className="dp-row-value">
                                                {doctor.email}
                                            </span>
                                        </div>

                                        <div className="dp-row">
                                            <span className="dp-key">
                                                Phone
                                            </span>
                                            <span className="dp-row-value">
                                                {showPhone
                                                    ? doctor.phone || "N/A"
                                                    : doctor.phoneMasked ||
                                                      "N/A"}
                                            </span>
                                            {doctor.phone && (
                                                <button
                                                    onClick={() =>
                                                        setShowPhone((p) => !p)
                                                    }
                                                >
                                                    {showPhone ? (
                                                        <EyeOff size={13} />
                                                    ) : (
                                                        <Eye size={13} />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        <div className="dp-row">
                                            <span className="dp-key">Appt</span>
                                            <span className="dp-row-value">
                                                <span className="dp-row-value">
                                                    {showApptPhone
                                                        ? doctor.appointmentPhone ||
                                                          "N/A"
                                                        : doctor.appointmentPhoneMasked ||
                                                          "N/A"}
                                                </span>
                                                {doctor.appointmentPhone && (
                                                    <button
                                                        onClick={() =>
                                                            setShowApptPhone(
                                                                (p) => !p,
                                                            )
                                                        }
                                                    >
                                                        {showApptPhone ? (
                                                            <EyeOff size={13} />
                                                        ) : (
                                                            <Eye size={13} />
                                                        )}
                                                    </button>
                                                )}
                                            </span>
                                        </div>
                                    </>
                                ),
                            },
                            {
                                label: "Professional",
                                value: (
                                    <div className="dp-group">
                                        <div className="dp-row">
                                            <span className="dp-key">
                                                Experience
                                            </span>
                                            <span>
                                                {doctor.experience || "N/A"} yrs
                                            </span>
                                        </div>

                                        <div className="dp-row">
                                            <span className="dp-key">
                                                Degree
                                            </span>
                                            <span>
                                                {doctor.degree?.join(", ") ||
                                                    "N/A"}
                                            </span>
                                        </div>

                                        <div className="dp-row">
                                            <span className="dp-key">
                                                Reg No
                                            </span>
                                            <span>
                                                {doctor.regNumber || "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                label: "Address",
                                value: (
                                    <div className="dp-group">
                                        <div className="dp-row">
                                            <span className="dp-key">Line</span>
                                            <span>
                                                {[
                                                    doctor.address?.line1,
                                                    doctor.address?.line2,
                                                    doctor.address?.line3,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ") || "N/A"}
                                            </span>
                                        </div>

                                        <div className="dp-row">
                                            <span className="dp-key">City</span>
                                            <span>
                                                {doctor.address?.city || "N/A"}
                                            </span>
                                        </div>

                                        <div className="dp-row">
                                            <span className="dp-key">
                                                State
                                            </span>
                                            <span>
                                                {doctor.address?.state || "N/A"}
                                            </span>
                                        </div>

                                        <div className="dp-row">
                                            <span className="dp-key">
                                                Pincode
                                            </span>
                                            <span>
                                                {doctor.address?.pincode ||
                                                    "N/A"}
                                            </span>
                                        </div>
                                    </div>
                                ),
                            },
                        ].map((item) => (
                            <div key={item.label} className="dp-info-item">
                                <div className="dp-info-label">
                                    {item.label}
                                </div>
                                <div className="dp-info-value">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Staff Management ── */}
                <Section icon={Users} title="Staff Management" accent="#60a5fa">
                    <div className="dp-grid3 dp-mb">
                        <div className="dp-field">
                            <label className="dp-label">Staff Name</label>
                            <input
                                className="dp-input"
                                placeholder="Enter name"
                                value={staffName}
                                onChange={(e) => setStaffName(e.target.value)}
                            />
                        </div>
                        <div className="dp-field">
                            <label className="dp-label">Phone Number</label>
                            <input
                                className="dp-input"
                                placeholder="10 digit number"
                                value={staffPhone}
                                onChange={(e) => setStaffPhone(e.target.value)}
                            />
                        </div>
                        <div className="dp-field">
                            <label className="dp-label">Role</label>
                            <select
                                className="dp-select"
                                value={staffRole}
                                onChange={(e) => setStaffRole(e.target.value)}
                            >
                                <option value="">Select Role</option>
                                <option value="receptionist">
                                    Receptionist
                                </option>
                                <option value="assistant">Assistant</option>
                                <option value="nurse">Nurse</option>
                            </select>
                        </div>
                    </div>

                    {isLimitReached && (
                        <div className="dp-warn-banner dp-mb">
                            <AlertTriangle size={14} />
                            Staff limit reached ({staffLimit}). Upgrade your
                            plan to add more staff.
                        </div>
                    )}

                    <button
                        className="dp-btn dp-btn-primary dp-mb"
                        onClick={handleAddStaff}
                        disabled={isLimitReached}
                    >
                        <UserPlus size={14} /> Add Staff
                    </button>

                    <div className="dp-divider" />

                    {staffList.length === 0 ? (
                        <div className="dp-empty">No staff added yet</div>
                    ) : (
                        <div className="dp-staff-grid">
                            {staffList.map((s) => {
                                const rc =
                                    ROLE_COLORS[s.role] ||
                                    ROLE_COLORS.assistant;
                                return (
                                    <div key={s._id} className="dp-staff-card">
                                        <div className="dp-staff-avatar">
                                            {s.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="dp-staff-info">
                                            <div className="dp-staff-name">
                                                {s.name}
                                            </div>
                                            <div className="dp-staff-phone">
                                                <Phone size={11} /> {s.phone}
                                            </div>
                                            <span
                                                className="dp-role-badge"
                                                style={{
                                                    background: rc.bg,
                                                    border: `1px solid ${rc.border}`,
                                                    color: rc.color,
                                                }}
                                            >
                                                {s.role}
                                            </span>
                                        </div>
                                        <div className="dp-staff-actions">
                                            <button
                                                className="dp-icon-btn dp-icon-edit"
                                                onClick={() =>
                                                    openEditStaffModal(s)
                                                }
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                className="dp-icon-btn dp-icon-del"
                                                onClick={() =>
                                                    deletestaff(s._id)
                                                }
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>

                {/* ── Availability ── */}
                <Section
                    icon={TimerIcon}
                    title="Availability (Timings)"
                    accent="#a78bfa"
                >
                    {availability.length === 0 ? (
                        <div className="dp-empty">No availability added</div>
                    ) : (
                        <div className="dp-avail-grid dp-mb">
                            {availability.map((dayBlock, index) => (
                                <div key={index} className="dp-avail-card">
                                    <div className="dp-avail-day">
                                        {dayBlock.day}
                                    </div>
                                    {dayBlock.slots?.map((slot, i) => (
                                        <div key={i} className="dp-slot-row">
                                            <span>
                                                {formatTime(slot.startTime)} →{" "}
                                                {formatTime(slot.endTime)}
                                            </span>
                                            <span className="dp-slot-duration">
                                                {slot.slotDuration} min
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        className="dp-btn dp-btn-outline"
                        onClick={() => {
                            setEditAvailability(
                                JSON.parse(JSON.stringify(availability)),
                            );
                            setSelectedDays([]);
                            setEditAvailOpen(true);
                        }}
                    >
                        <Pencil size={13} /> Edit Availability
                    </button>
                </Section>

                {/* ── Change Password ── */}
                <Section icon={Lock} title="Change Password" accent="#fb923c">
                    <div className="dp-grid3 dp-mb">
                        <PasswordInput
                            label="Current Password"
                            placeholder="••••••••"
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                                setPasswordData({
                                    ...passwordData,
                                    currentPassword: e.target.value,
                                })
                            }
                            typeKey="current"
                            showPasswords={showPasswords}
                            setShowPasswords={setShowPasswords}
                        />
                        <div>
                            <PasswordInput
                                label="New Password"
                                placeholder="Min. 6 characters"
                                value={passwordData.newPassword}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        newPassword: e.target.value,
                                    })
                                }
                                typeKey="new"
                                showPasswords={showPasswords}
                                setShowPasswords={setShowPasswords}
                            />
                            {passwordData.newPassword && (
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: strength.color,
                                        marginTop: 5,
                                        letterSpacing: "0.04em",
                                    }}
                                >
                                    Strength: {strength.label}
                                </div>
                            )}
                        </div>
                        <div>
                            <PasswordInput
                                label="Confirm Password"
                                placeholder="Re-enter password"
                                value={passwordData.confirmPassword}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        confirmPassword: e.target.value,
                                    })
                                }
                                typeKey="confirm"
                                showPasswords={showPasswords}
                                setShowPasswords={setShowPasswords}
                            />
                            {passwordData.confirmPassword && (
                                <div
                                    style={{
                                        fontSize: 10,
                                        color: passwordsMatch
                                            ? "#4ade80"
                                            : "#f87171",
                                        marginTop: 5,
                                    }}
                                >
                                    {passwordsMatch
                                        ? "✓ Passwords match"
                                        : "✗ Do not match"}
                                </div>
                            )}
                        </div>
                    </div>
                    <div
                        style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                        <button
                            className="dp-btn dp-btn-danger"
                            onClick={handleChangePassword}
                            disabled={
                                !passwordData.currentPassword ||
                                !passwordData.newPassword ||
                                !passwordData.confirmPassword ||
                                !passwordsMatch
                            }
                        >
                            <RefreshCcw size={13} /> Update Password
                        </button>
                    </div>
                </Section>

                {/* ══════════════ MODALS ══════════════ */}

                {/* Edit Profile Modal */}
                {editProfileOpen && (
                    <div
                        className="dp-modal-bg"
                        onClick={() => setEditProfileOpen(false)}
                    >
                        <div
                            className="dp-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="dp-modal-header">
                                <div className="dp-modal-title">
                                    Edit <em>Profile</em>
                                </div>
                                <button
                                    className="dp-modal-close"
                                    onClick={() => setEditProfileOpen(false)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="dp-modal-body">
                                <div className="dp-modal-section-title">
                                    Basic Information
                                </div>
                                <div className="dp-grid2 dp-mb">
                                    <div className="dp-field">
                                        <label className="dp-label">Name</label>
                                        <input
                                            className="dp-input"
                                            name="name"
                                            value={editData.name}
                                            onChange={handleEditChange}
                                        />
                                    </div>
                                    <div className="dp-field">
                                        <label className="dp-label">
                                            Clinic Name
                                        </label>
                                        <input
                                            className="dp-input"
                                            name="clinicName"
                                            value={editData.clinicName}
                                            onChange={handleEditChange}
                                        />
                                    </div>
                                    <div className="dp-field">
                                        <label className="dp-label">
                                            Phone
                                        </label>
                                        <input
                                            className="dp-input"
                                            name="phone"
                                            value={editData.phone}
                                            onChange={handleEditChange}
                                        />
                                    </div>
                                    <div className="dp-field">
                                        <label className="dp-label">
                                            Appointment Phone
                                        </label>
                                        <input
                                            className="dp-input"
                                            name="appointmentPhone"
                                            value={
                                                editData.appointmentPhone || ""
                                            }
                                            onChange={handleEditChange}
                                        />
                                    </div>
                                    <div className="dp-field">
                                        <label className="dp-label">
                                            Registration No
                                        </label>
                                        <input
                                            className="dp-input"
                                            name="regNumber"
                                            value={editData.regNumber}
                                            onChange={handleEditChange}
                                        />
                                    </div>
                                </div>

                                <div className="dp-modal-section-title">
                                    Qualifications
                                </div>
                                {editData.degree.map((deg, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <input
                                            className="dp-input"
                                            placeholder="Enter degree"
                                            value={deg}
                                            onChange={(e) =>
                                                handleDegreeChange(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <button
                                            className="dp-icon-btn dp-icon-del"
                                            onClick={() =>
                                                removeDegreeField(index)
                                            }
                                            disabled={
                                                editData.degree.length === 1
                                            }
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className="dp-btn dp-btn-outline dp-btn-sm dp-mb"
                                    onClick={addDegreeField}
                                >
                                    <Plus size={11} /> Add Degree
                                </button>

                                <div className="dp-modal-section-title">
                                    Clinic Address
                                </div>
                                <div className="dp-field dp-mb">
                                    <input
                                        className="dp-input"
                                        name="line1"
                                        placeholder="Address Line 1"
                                        value={editData.address.line1}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                                <div className="dp-field dp-mb">
                                    <input
                                        className="dp-input"
                                        name="line2"
                                        placeholder="Address Line 2 (optional)"
                                        value={editData.address.line2}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                                <div className="dp-field dp-mb">
                                    <input
                                        className="dp-input"
                                        name="line3"
                                        placeholder="Address Line 3 (optional)"
                                        value={editData.address.line3}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                                <div className="dp-grid3">
                                    <div className="dp-field">
                                        <label className="dp-label">City</label>
                                        <input
                                            className="dp-input"
                                            name="city"
                                            value={editData.address.city}
                                            onChange={handleAddressChange}
                                        />
                                    </div>
                                    <div className="dp-field">
                                        <label className="dp-label">
                                            State
                                        </label>
                                        <input
                                            className="dp-input"
                                            name="state"
                                            value={editData.address.state}
                                            onChange={handleAddressChange}
                                        />
                                    </div>
                                    <div className="dp-field">
                                        <label className="dp-label">
                                            Pincode
                                        </label>
                                        <input
                                            className="dp-input"
                                            name="pincode"
                                            value={editData.address.pincode}
                                            onChange={handleAddressChange}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="dp-modal-footer">
                                <button
                                    className="dp-btn dp-btn-outline"
                                    onClick={() => setEditProfileOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="dp-btn dp-btn-primary"
                                    onClick={handleSaveProfile}
                                >
                                    <Check size={13} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Staff Modal */}
                {editStaffOpen && (
                    <div
                        className="dp-modal-bg"
                        onClick={() => setEditStaffOpen(false)}
                    >
                        <div
                            className="dp-modal dp-modal-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="dp-modal-header">
                                <div className="dp-modal-title">
                                    Edit <em>Staff</em>
                                </div>
                                <button
                                    className="dp-modal-close"
                                    onClick={() => setEditStaffOpen(false)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="dp-modal-body">
                                <div className="dp-field dp-mb">
                                    <label className="dp-label">Name</label>
                                    <input
                                        className="dp-input"
                                        value={editStaffData.name}
                                        onChange={(e) =>
                                            setEditStaffData({
                                                ...editStaffData,
                                                name: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="dp-field dp-mb">
                                    <label className="dp-label">Phone</label>
                                    <input
                                        className="dp-input"
                                        value={editStaffData.phone}
                                        onChange={(e) =>
                                            setEditStaffData({
                                                ...editStaffData,
                                                phone: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="dp-field">
                                    <label className="dp-label">Role</label>
                                    <select
                                        className="dp-select"
                                        value={editStaffData.role}
                                        onChange={(e) =>
                                            setEditStaffData({
                                                ...editStaffData,
                                                role: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="receptionist">
                                            Receptionist
                                        </option>
                                        <option value="assistant">
                                            Assistant
                                        </option>
                                        <option value="nurse">Nurse</option>
                                    </select>
                                </div>
                            </div>
                            <div className="dp-modal-footer">
                                <button
                                    className="dp-btn dp-btn-outline"
                                    onClick={() => setEditStaffOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="dp-btn dp-btn-primary"
                                    onClick={editstaff}
                                >
                                    <Check size={13} /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Availability Modal */}
                {editAvailOpen && (
                    <div
                        className="dp-modal-bg"
                        onClick={() => setEditAvailOpen(false)}
                    >
                        <div
                            className="dp-modal"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="dp-modal-header">
                                <div className="dp-modal-title">
                                    Edit <em>Availability</em>
                                </div>
                                <button
                                    className="dp-modal-close"
                                    onClick={() => setEditAvailOpen(false)}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="dp-modal-body">
                                <div className="dp-modal-section-title">
                                    Select Days
                                </div>
                                <div className="dp-days-row dp-mb">
                                    {[
                                        "Mon",
                                        "Tue",
                                        "Wed",
                                        "Thu",
                                        "Fri",
                                        "Sat",
                                        "Sun",
                                    ].map((day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            className={`dp-day-chip ${selectedDays.includes(day) ? "active" : ""}`}
                                            onClick={() =>
                                                setSelectedDays((prev) =>
                                                    prev.includes(day)
                                                        ? prev.filter(
                                                              (d) => d !== day,
                                                          )
                                                        : [...prev, day],
                                                )
                                            }
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>

                                <div className="dp-modal-section-title">
                                    Time Slots
                                </div>
                                {tempSlots.map((slot, index) => (
                                    <div
                                        key={index}
                                        className="dp-slot-edit-row dp-mb"
                                    >
                                        <div className="dp-field">
                                            <label className="dp-label">
                                                Start
                                            </label>
                                            <input
                                                type="time"
                                                className="dp-input"
                                                value={slot.startTime}
                                                onChange={(e) => {
                                                    const u = [...tempSlots];
                                                    u[index].startTime =
                                                        e.target.value;
                                                    setTempSlots(u);
                                                }}
                                            />
                                        </div>
                                        <div className="dp-field">
                                            <label className="dp-label">
                                                End
                                            </label>
                                            <input
                                                type="time"
                                                className="dp-input"
                                                value={slot.endTime}
                                                onChange={(e) => {
                                                    const u = [...tempSlots];
                                                    u[index].endTime =
                                                        e.target.value;
                                                    setTempSlots(u);
                                                }}
                                            />
                                        </div>
                                        <div className="dp-field">
                                            <label className="dp-label">
                                                Gap (min)
                                            </label>
                                            <input
                                                type="number"
                                                className="dp-input"
                                                value={slot.slotDuration}
                                                onChange={(e) => {
                                                    const u = [...tempSlots];
                                                    u[index].slotDuration =
                                                        Number(e.target.value);
                                                    setTempSlots(u);
                                                }}
                                            />
                                        </div>
                                        <button
                                            className="dp-icon-btn dp-icon-del"
                                            style={{ alignSelf: "flex-end" }}
                                            onClick={() => {
                                                const u = [...tempSlots];
                                                u.splice(index, 1);
                                                setTempSlots(u);
                                            }}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className="dp-btn dp-btn-outline dp-btn-sm dp-mb"
                                    onClick={() =>
                                        setTempSlots([
                                            ...tempSlots,
                                            {
                                                startTime: "10:00",
                                                endTime: "11:00",
                                                slotDuration: 15,
                                            },
                                        ])
                                    }
                                >
                                    <Plus size={11} /> Add Slot
                                </button>

                                <button
                                    className="dp-btn dp-btn-primary dp-mb"
                                    onClick={() => {
                                        if (selectedDays.length === 0) return;
                                        let updated = [...editAvailability];
                                        selectedDays.forEach((day) => {
                                            const idx = updated.findIndex(
                                                (d) => d.day === day,
                                            );
                                            if (idx !== -1)
                                                updated[idx].slots = tempSlots;
                                            else
                                                updated.push({
                                                    day,
                                                    slots: tempSlots,
                                                });
                                        });
                                        setEditAvailability(updated);
                                    }}
                                >
                                    <Check size={13} /> Apply to Selected Days
                                </button>

                                <div className="dp-divider" />

                                <div className="dp-modal-section-title">
                                    Preview
                                </div>
                                {editAvailability.map((dayBlock, dayIndex) => (
                                    <div
                                        key={dayIndex}
                                        style={{ marginBottom: 12 }}
                                    >
                                        <div
                                            style={{
                                                fontSize: 11,
                                                color: "#a78bfa",
                                                letterSpacing: "0.08em",
                                                marginBottom: 4,
                                            }}
                                        >
                                            {dayBlock.day}
                                        </div>
                                        {dayBlock.slots.map((slot, si) => (
                                            <div
                                                key={si}
                                                className="dp-slot-row"
                                            >
                                                <span>
                                                    {slot.startTime} →{" "}
                                                    {slot.endTime}
                                                </span>
                                                <span className="dp-slot-duration">
                                                    {slot.slotDuration} min
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="dp-modal-footer">
                                <button
                                    className="dp-btn dp-btn-outline"
                                    onClick={() => setEditAvailOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="dp-btn dp-btn-primary"
                                    onClick={async () => {
                                        try {
                                            const res = await authFetch(
                                                `${API_BASE_URL}/api/doctor/timing/update_availability`,
                                                {
                                                    method: "PUT",
                                                    headers: {
                                                        "Content-Type":
                                                            "application/json",
                                                    },
                                                    body: JSON.stringify({
                                                        availability:
                                                            editAvailability,
                                                    }),
                                                },
                                            );
                                            const data = await res.json();
                                            if (data.success) {
                                                setAvailability(
                                                    editAvailability,
                                                );
                                                setEditAvailOpen(false);
                                                props.showAlert(
                                                    "Updated successfully",
                                                    "success",
                                                );
                                            } else
                                                props.showAlert(
                                                    "Update failed",
                                                    "danger",
                                                );
                                        } catch {
                                            props.showAlert(
                                                "Server error",
                                                "danger",
                                            );
                                        }
                                    }}
                                >
                                    <Check size={13} /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
