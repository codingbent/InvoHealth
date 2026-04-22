import { useEffect, useState, useCallback } from "react";
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
    Check,
    AlertTriangle,
    CreditCard,
    Stethoscope,
    MapPin,
    GraduationCap,
    ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "../components/config";
import "../css/Doctorprofile.css";
import { fetchCountries } from "../api/country.api";

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
                    style={{ background: `${accent}14`, color: accent }}
                >
                    <Icon size={15} />
                </span>
                <span className="dp-section-title">{title}</span>
                <ChevronDown
                    size={14}
                    className={`dp-chevron ${open ? "open" : ""}`}
                />
            </button>
            {open && <div className="dp-section-body">{children}</div>}
        </div>
    );
};

/* ── Add Payment Form ── */
function AddPaymentForm({ categories, subCategories, onAdd }) {
    const [categoryId, setCategoryId] = useState("");
    const [subCategoryId, setSubCategoryId] = useState("");
    const [label, setLabel] = useState("");
    const filteredSubs = subCategories.filter(
        (s) => s.categoryId?.toString() === categoryId,
    );

    const handleAdd = () => {
        if (!categoryId || !subCategoryId) {
            alert("Please select category and subcategory");
            return;
        }
        onAdd({
            categoryId,
            subCategoryId,
            label:
                label.trim() ||
                filteredSubs.find((s) => s._id === subCategoryId)?.name ||
                "",
            isActive: true,
        });
        setCategoryId("");
        setSubCategoryId("");
        setLabel("");
    };

    return (
        <div
            style={{
                padding: "12px",
                borderRadius: 10,
                border: "1px dashed rgba(255,255,255,.1)",
                marginBottom: 8,
            }}
        >
            <div className="dp-field dp-mb">
                <label className="dp-label">Category</label>
                <select
                    className="dp-select"
                    value={categoryId}
                    onChange={(e) => {
                        setCategoryId(e.target.value);
                        setSubCategoryId("");
                    }}
                >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                            {c.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="dp-field dp-mb">
                <label className="dp-label">Subcategory</label>
                <select
                    className="dp-select"
                    value={subCategoryId}
                    onChange={(e) => setSubCategoryId(e.target.value)}
                    disabled={!categoryId}
                >
                    <option value="">Select Subcategory</option>
                    {filteredSubs.map((s) => (
                        <option key={s._id} value={s._id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </div>
            <div className="dp-field dp-mb">
                <label className="dp-label">
                    Label{" "}
                    <span style={{ opacity: 0.4, fontSize: 10 }}>
                        (optional)
                    </span>
                </label>
                <input
                    className="dp-input"
                    placeholder="e.g. My HDFC Account"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                />
            </div>
            <button
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={handleAdd}
            >
                <Plus size={11} /> Add to List
            </button>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function DoctorProfile(props) {
    const [doctor, setDoctor] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [staffName, setStaffName] = useState("");
    const [staffPhone, setStaffPhone] = useState("");
    const [staffRole, setStaffRole] = useState("");
    const [subscription, setSubscription] = useState(null);
    const isExpired = subscription?.status === "expired";
    const [staffCountryCode, setStaffCountryCode] = useState("+91");
    // eslint-disable-next-line
    const [usage, setUsage] = useState(null);
    // eslint-disable-next-line
    const [staffCount, setStaffCount] = useState(0);
    const [pricing, setPricing] = useState(null);
    const [availability, setAvailability] = useState([]);
    const [editAvailability, setEditAvailability] = useState([]);
    const [selectedDays, setSelectedDays] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [editPaymentsOpen, setEditPaymentsOpen] = useState(false);
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editStaffOpen, setEditStaffOpen] = useState(false);
    const [editAvailOpen, setEditAvailOpen] = useState(false);
    const [showPhone, setShowPhone] = useState(false);
    const [showApptPhone, setShowApptPhone] = useState(false);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const planKey = subscription?.plan?.toLowerCase();
    const [countries, setCountries] = useState([]);
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
        countryCode: "",
        role: "",
    });
    const [editData, setEditData] = useState({
        name: "",
        clinicName: "",
        phone: "",
        appointmentPhone: "",
        countryCode: "+91",
        regNumber: "",
        degree: [""],
        address: {
            line1: "",
            line2: "",
            line3: "",
            city: "",
            state: "",
            pincode: "",
        },
    });

    // selectedCountry drives the payload — derived from editData.countryCode
    const selectedCountry = countries.find(
        (c) => c.dialCode === editData.countryCode,
    );

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const ROLE_COLORS = {
        receptionist: {
            bg: "rgba(96,165,250,.1)",
            border: "rgba(96,165,250,.2)",
            color: "#60a5fa",
        },
        assistant: {
            bg: "rgba(167,139,250,.1)",
            border: "rgba(167,139,250,.2)",
            color: "#a78bfa",
        },
        nurse: {
            bg: "rgba(244,114,182,.1)",
            border: "rgba(244,114,182,.2)",
            color: "#f472b6",
        },
    };

    const passwordsMatch =
        passwordData.newPassword === passwordData.confirmPassword;
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

    const splitPhone = (phone = "") => {
        const match = phone.match(/^(\+\d+)(\d+)$/);
        return {
            countryCode: match?.[1] || "+91",
            number: match?.[2] || phone,
        };
    };

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

    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/doctor/get_doc`);
            const data = await res.json();
            if (!data.success) return;
            const doc = data.doctor;
            setDoctor(doc);
            setSubscription(doc.subscription || {});
            setUsage(doc.usage || {});
            setStaffCount(
                (data.staff || []).filter((s) => s.isActive && !s.isDeleted)
                    .length,
            );

            // FIX: was setPaymentMethods() with no args — now correctly maps the array
            setPaymentMethods(
                (doc.paymentMethods || []).map((m) => ({
                    categoryId:
                        m.categoryId?._id?.toString() ||
                        m.categoryId?.toString() ||
                        "",
                    subCategoryId:
                        m.subCategoryId?._id?.toString() ||
                        m.subCategoryId?.toString() ||
                        "",
                    label: m.label || "",
                    isActive: m.isActive ?? true,
                    _categoryName: m.categoryId?.name || "",
                    _subCategoryName: m.subCategoryId?.name || "",
                })),
            );

            // dialCode comes from the backend get_doc response (e.g. "+1", "+91")
            const dialCode = doc?.dialCode || "+91";

            // Strip the dial code prefix from the stored full phone so the
            // input only shows the local number (e.g. "8273427800" not "18273427800")
            const stripDialCode = (fullPhone = "") => {
                if (!fullPhone) return "";
                const dialDigits = dialCode.replace(/\D/g, ""); // "1" from "+1"
                const phoneDigits = fullPhone.replace(/\D/g, "");
                if (phoneDigits.startsWith(dialDigits)) {
                    return phoneDigits.slice(dialDigits.length);
                }
                return phoneDigits;
            };

            setEditData({
                name: doc.name || "",
                clinicName: doc.clinicName || "",
                // Show masked placeholder if we only have last4;
                // otherwise strip dial code so input shows local digits only
                phone: doc.phoneLast4
                    ? `••••${doc.phoneLast4}`
                    : stripDialCode(doc.phone),
                appointmentPhone: doc.appointmentPhoneLast4
                    ? `••••${doc.appointmentPhoneLast4}`
                    : stripDialCode(doc.appointmentPhone),
                countryCode: dialCode,
                regNumber: doc.regNumber || "",
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
    }, []);

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
    }, []);

    const fetchStaff = useCallback(async () => {
        try {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/staff/fetch_staff`,
            );
            const data = await res.json();
            setStaffCount(
                data.staff.filter((s) => s.isActive && !s.isDeleted).length,
            );
            if (data.success) setStaffList(data.staff);
        } catch (err) {
            console.error(err);
        }
    }, []);

    // Sync staff country code default to doctor's country after fetch
    useEffect(() => {
        if (doctor?.dialCode) {
            setStaffCountryCode(doctor.dialCode);
        } else if (doctor?.address?.dialCode) {
            setStaffCountryCode(doctor.address.dialCode);
        }
    }, [doctor]);

    const handleSaveProfile = async () => {
        try {
            if (!selectedCountry) {
                props.showAlert("Country not loaded", "danger");
                return;
            }
            if (!editData.name?.trim())
                return props.showAlert("Name is required", "danger");
            if (!editData.clinicName?.trim())
                return props.showAlert(
                    "Medical Center name is required",
                    "danger",
                );

            const isMasked = (val) => val?.includes("•");

            // If masked, send null (skip update); otherwise strip non-digits
            const cleanPhone = isMasked(editData.phone)
                ? null
                : editData.phone.replace(/\D/g, "");

            const cleanAppt = isMasked(editData.appointmentPhone)
                ? null
                : editData.appointmentPhone.replace(/\D/g, "");

            if (
                cleanPhone !== null &&
                (cleanPhone.length < 8 || cleanPhone.length > 15)
            )
                return props.showAlert("Invalid phone number", "danger");

            if (
                cleanAppt !== null &&
                cleanAppt.length > 0 &&
                (cleanAppt.length < 8 || cleanAppt.length > 15)
            )
                return props.showAlert("Invalid appointment phone", "danger");

            const dialCode = editData.countryCode || "+91";

            const cleanDegree = Array.isArray(editData.degree)
                ? editData.degree
                      .filter((d) => typeof d === "string" && d.trim() !== "")
                      .map((d) => d.trim())
                : [];

            const allowedAddressFields = [
                "line1",
                "line2",
                "line3",
                "city",
                "state",
                "pincode",
            ];
            const cleanAddress = {};
            if (editData.address && typeof editData.address === "object") {
                allowedAddressFields.forEach((key) => {
                    const val = editData.address[key];
                    if (typeof val === "string" && val.trim())
                        cleanAddress[key] = val.trim();
                });
            }

            const payload = {
                name: editData.name.trim(),
                clinicName: editData.clinicName.trim(),
                regNumber: editData.regNumber?.trim() || "",
                degree: cleanDegree,
                experience: editData.experience || "",
                // Only send phone fields if the user actually changed them
                // (unmasked and typed a new number)
                ...(cleanPhone !== null && {
                    phone: `${dialCode}${cleanPhone}`,
                }),
                ...(cleanAppt !== null &&
                    cleanAppt.length > 0 && {
                        appointmentPhone: `${dialCode}${cleanAppt}`,
                    }),
                countryId: selectedCountry._id,
                countryCode: selectedCountry.dialCode,
                address: cleanAddress,
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

            if (!res.ok || !data.success)
                return props.showAlert(
                    data.error || "Profile update failed",
                    "danger",
                );

            await fetchDoctor();
            setEditProfileOpen(false);
            props.showAlert("Profile updated successfully", "success");
        } catch (err) {
            console.error("Update profile error:", err);
            props.showAlert("Server error. Please try again.", "danger");
        }
    };

    const handleAddStaff = async () => {
        if (subscription?.status === "expired") {
            props.showAlert("Subscription expired. Please upgrade.", "danger");
            return;
        }
        if (isLimitReached) {
            props.showAlert(
                `Staff limit reached (${staffLimit}). Upgrade required.`,
                "warning",
            );
            return;
        }
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
                    // FIX: staffCountryCode already contains "+" (e.g. "+91")
                    // so do NOT prefix another "+" — was: `+${staffCountryCode}${staffPhone}`
                    phone: `${staffCountryCode}${staffPhone}`,
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
        } else props.showAlert(data.error || "Failed", "danger");
    };

    const toggleStaff = async (id) => {
        const res = await authFetch(
            `${API_BASE_URL}/api/doctor/staff/toggle_staff/${id}`,
            { method: "PUT" },
        );
        const data = await res.json();
        if (data.success) {
            fetchStaff();
            props.showAlert(data.message, "success");
        } else props.showAlert(data.error, "danger");
    };

    const validatePassword = (password) => ({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    });

    const passwordRules = validatePassword(passwordData.newPassword);
    const isPasswordValid = Object.values(passwordRules).every(Boolean);

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
        if (!isPasswordValid) {
            props.showAlert(
                "Password must include uppercase, lowercase, number, and special character",
                "danger",
            );
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
        if (!window.confirm("Do you want to delete this staff member?")) return;
        const res = await authFetch(
            `${API_BASE_URL}/api/doctor/staff/delete_staff/${staffId}`,
            { method: "DELETE" },
        );
        const data = await res.json();
        if (data.success) fetchStaff();
        else alert(data.error);
    };

    const openEditStaffModal = (staff) => {
        const parsed = splitPhone(staff.phone);
        setEditStaffData({
            _id: staff._id,
            name: staff.name,
            phone: parsed.number,
            countryCode: parsed.countryCode,
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
                    phone: `${editStaffData.countryCode}${editStaffData.phone}`,
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

    useEffect(() => {
        fetchDoctor();
        fetchStaff();
        fetchAvailability();
    }, [fetchDoctor, fetchStaff, fetchAvailability]);

    useEffect(() => {
        const loadCountries = async () => {
            try {
                const data = await fetchCountries();
                setCountries(data || []);
            } catch (err) {
                console.error("Failed to load countries", err);
            }
        };
        loadCountries();
    }, []);

    useEffect(() => {
        const fetchMaster = async () => {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/payment-master`,
            );
            const data = await res.json();
            if (data.success) {
                setCategories(data.categories);
                setSubCategories(data.subCategories);
            }
        };
        fetchMaster();
    }, []);

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
    }, []);

    /* ── Skeleton loader ── */
    if (!doctor) {
        return (
            <div className="dp-root">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="dp-card dp-mb"
                        style={{ padding: 24, opacity: 1 - i * 0.22 }}
                    >
                        <div
                            style={{
                                display: "flex",
                                gap: 16,
                                alignItems: "center",
                            }}
                        >
                            <div
                                className="dp-skeleton"
                                style={{
                                    width: 50,
                                    height: 50,
                                    borderRadius: 14,
                                }}
                            />
                            <div style={{ flex: 1 }}>
                                <div
                                    className="dp-skeleton"
                                    style={{
                                        height: 12,
                                        width: "38%",
                                        marginBottom: 9,
                                        borderRadius: 5,
                                    }}
                                />
                                <div
                                    className="dp-skeleton"
                                    style={{
                                        height: 9,
                                        width: "22%",
                                        borderRadius: 4,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    /* ── Subscription header badge ── */
    const subStatus = subscription?.status || "free";
    const subPlan = subscription?.plan?.toUpperCase() || "FREE";
    const badgeColors = {
        active: {
            bg: "rgba(74,222,128,.1)",
            border: "rgba(74,222,128,.2)",
            color: "#4ade80",
        },
        expired: {
            bg: "rgba(248,113,113,.1)",
            border: "rgba(248,113,113,.2)",
            color: "#f87171",
        },
        trial: {
            bg: "rgba(251,146,60,.1)",
            border: "rgba(251,146,60,.2)",
            color: "#fb923c",
        },
    };
    const bc = badgeColors[subStatus] || badgeColors.trial;

    return (
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
                            <div className="dp-doc-center">
                                {doctor.clinicName}
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                        }}
                    >
                        <span
                            className="dp-sub-badge"
                            style={{
                                background: bc.bg,
                                borderColor: bc.border,
                                color: bc.color,
                            }}
                        >
                            <ShieldCheck size={10} />
                            {subPlan} · {subStatus.toUpperCase()}
                        </span>
                        <button
                            className="dp-edit-btn"
                            onClick={() => setEditProfileOpen(true)}
                        >
                            <Pencil size={13} /> Edit Profile
                        </button>
                    </div>
                </div>

                <div className="dp-info-grid">
                    {[
                        {
                            label: "Contact",
                            icon: Phone,
                            value: (
                                <>
                                    <div className="dp-row">
                                        <span className="dp-key">Email</span>
                                        <span className="dp-row-value">
                                            {doctor.email}
                                        </span>
                                    </div>
                                    <div className="dp-row">
                                        <span className="dp-key">Phone</span>
                                        <span className="dp-row-value">
                                            {showPhone
                                                ? doctor.phone || "N/A"
                                                : doctor.phoneMasked || "N/A"}
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
                                            {showApptPhone
                                                ? doctor.appointmentPhone ||
                                                  "N/A"
                                                : doctor.appointmentPhoneMasked ||
                                                  "N/A"}
                                        </span>
                                        {doctor.appointmentPhone && (
                                            <button
                                                onClick={() =>
                                                    setShowApptPhone((p) => !p)
                                                }
                                            >
                                                {showApptPhone ? (
                                                    <EyeOff size={13} />
                                                ) : (
                                                    <Eye size={13} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </>
                            ),
                        },
                        {
                            label: "Professional",
                            icon: Stethoscope,
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
                                        <span className="dp-key">Degree</span>
                                        <span>
                                            {doctor.degree?.join(", ") || "N/A"}
                                        </span>
                                    </div>
                                    <div className="dp-row">
                                        <span className="dp-key">Reg No</span>
                                        <span>{doctor.regNumber || "N/A"}</span>
                                    </div>
                                </div>
                            ),
                        },
                        {
                            label: "Address",
                            icon: MapPin,
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
                                        <span className="dp-key">State</span>
                                        <span>
                                            {doctor.address?.state || "N/A"}
                                        </span>
                                    </div>
                                    <div className="dp-row">
                                        <span className="dp-key">Pincode</span>
                                        <span>
                                            {doctor.address?.pincode || "N/A"}
                                        </span>
                                    </div>
                                    <div className="dp-row">
                                        <span className="dp-key">Country</span>
                                        <span>
                                            {doctor.address?.country || "N/A"}
                                        </span>
                                    </div>
                                </div>
                            ),
                        },
                    ].map((item) => (
                        <div key={item.label} className="dp-info-item">
                            <div className="dp-info-label">
                                <item.icon size={10} />
                                {item.label}
                            </div>
                            <div className="dp-info-value">{item.value}</div>
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
                        <div style={{ display: "flex", gap: 8 }}>
                            <select
                                className="dp-input"
                                style={{ maxWidth: 120 }}
                                value={staffCountryCode}
                                onChange={(e) =>
                                    setStaffCountryCode(e.target.value)
                                }
                            >
                                {countries.map((c) => (
                                    <option key={c._id} value={c.dialCode}>
                                        {c.dialCode}
                                    </option>
                                ))}
                            </select>
                            <input
                                className="dp-input"
                                placeholder="Enter phone number"
                                value={staffPhone}
                                onChange={(e) =>
                                    setStaffPhone(
                                        e.target.value.replace(/\D/g, ""),
                                    )
                                }
                            />
                        </div>
                    </div>
                    <div className="dp-field">
                        <label className="dp-label">Role</label>
                        <select
                            className="dp-select"
                            value={staffRole}
                            onChange={(e) => setStaffRole(e.target.value)}
                        >
                            <option value="">Select Role</option>
                            <option value="receptionist">Receptionist</option>
                            <option value="assistant">Assistant</option>
                            <option value="nurse">Nurse</option>
                        </select>
                    </div>
                </div>

                {isExpired ? (
                    <div className="dp-warn-banner dp-mb">
                        <AlertTriangle size={14} />
                        Your subscription has expired. Upgrade to add staff.
                    </div>
                ) : isLimitReached ? (
                    <div className="dp-warn-banner dp-mb">
                        <AlertTriangle size={14} />
                        Staff limit reached ({staffLimit}). Upgrade your plan to
                        add more staff.
                    </div>
                ) : null}

                <button
                    className="dp-btn dp-btn-primary dp-mb"
                    onClick={handleAddStaff}
                    disabled={isLimitReached || isExpired}
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
                                ROLE_COLORS[s.role] || ROLE_COLORS.assistant;
                            return (
                                <div
                                    key={s._id}
                                    className="dp-staff-card"
                                    style={{
                                        opacity: s.isActive ? 1 : 0.5,
                                        filter: s.isActive
                                            ? "none"
                                            : "grayscale(80%)",
                                        position: "relative",
                                    }}
                                >
                                    {!s.isActive && (
                                        <span
                                            style={{
                                                position: "absolute",
                                                top: 8,
                                                right: 8,
                                                fontSize: 10,
                                                padding: "2px 7px",
                                                borderRadius: 6,
                                                background:
                                                    "rgba(248,113,113,.1)",
                                                color: "#f87171",
                                                border: "1px solid rgba(248,113,113,.3)",
                                            }}
                                        >
                                            Inactive
                                        </span>
                                    )}
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
                                            onClick={() => deletestaff(s._id)}
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                        <button
                                            className="dp-icon-btn"
                                            onClick={() => toggleStaff(s._id)}
                                            title={
                                                s.isActive
                                                    ? "Deactivate"
                                                    : "Activate"
                                            }
                                        >
                                            {s.isActive ? (
                                                <EyeOff size={13} />
                                            ) : (
                                                <Eye size={13} />
                                            )}
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

            {/* ── Payment Methods ── */}
            <Section icon={CreditCard} title="Payment Methods" accent="#34d399">
                {paymentMethods.length === 0 ? (
                    <div className="dp-empty">No payment methods added</div>
                ) : (
                    <div className="dp-staff-grid dp-mb">
                        {paymentMethods.map((p, i) => (
                            <div key={i} className="dp-staff-card">
                                <div className="dp-staff-info">
                                    <div className="dp-staff-name">
                                        {p.label || "Payment"}
                                    </div>
                                    <div className="dp-staff-phone">
                                        {categories.find(
                                            (c) =>
                                                c._id?.toString() ===
                                                p.categoryId?.toString(),
                                        )?.name || p._categoryName}
                                        {" - "}
                                        {subCategories.find(
                                            (s) =>
                                                s._id?.toString() ===
                                                p.subCategoryId?.toString(),
                                        )?.name || p._subCategoryName}
                                    </div>
                                    <span className="dp-role-badge">
                                        {p.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="dp-staff-actions">
                                    <button
                                        className="dp-icon-btn"
                                        onClick={() => {
                                            const updated = [...paymentMethods];
                                            updated[i] = {
                                                ...updated[i],
                                                isActive: !updated[i].isActive,
                                            };
                                            setPaymentMethods(updated);
                                        }}
                                    >
                                        {p.isActive ? (
                                            <EyeOff size={13} />
                                        ) : (
                                            <Eye size={13} />
                                        )}
                                    </button>
                                    <button
                                        className="dp-icon-btn dp-icon-del"
                                        onClick={() =>
                                            setPaymentMethods(
                                                paymentMethods.filter(
                                                    (_, idx) => idx !== i,
                                                ),
                                            )
                                        }
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <button
                    className="dp-btn dp-btn-outline"
                    onClick={() => setEditPaymentsOpen(true)}
                >
                    <Pencil size={13} /> Edit Payment Methods
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
                            placeholder="Min. 8 characters"
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
                        <div style={{ marginTop: 8 }}>
                            {[
                                ["length", "Min 8 characters"],
                                ["uppercase", "Uppercase letter"],
                                ["lowercase", "Lowercase letter"],
                                ["number", "Number"],
                                ["special", "Special character"],
                            ].map(([key, label]) => (
                                <div key={key} className="dp-pw-rule">
                                    <div
                                        className="dp-pw-rule-dot"
                                        style={{
                                            background: passwordRules[key]
                                                ? "#4ade80"
                                                : "#1a2540",
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: 10,
                                            color: passwordRules[key]
                                                ? "#4ade80"
                                                : "#2e3d5c",
                                        }}
                                    >
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
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
                                    marginTop: 6,
                                }}
                            >
                                {passwordsMatch
                                    ? "✓ Passwords match"
                                    : "✗ Do not match"}
                            </div>
                        )}
                    </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        className="dp-btn dp-btn-danger"
                        onClick={handleChangePassword}
                        disabled={
                            !passwordData.currentPassword ||
                            !passwordData.newPassword ||
                            !passwordData.confirmPassword ||
                            !passwordsMatch ||
                            !isPasswordValid
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
                                        Medical Center Name
                                    </label>
                                    <input
                                        className="dp-input"
                                        name="clinicName"
                                        value={editData.clinicName}
                                        onChange={handleEditChange}
                                    />
                                </div>
                                <div className="dp-field">
                                    <label className="dp-label">Phone</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <select
                                            className="dp-select"
                                            style={{
                                                width: "auto",
                                                flexShrink: 0,
                                                paddingRight: 28,
                                            }}
                                            value={
                                                editData.countryCode || "+91"
                                            }
                                            onChange={(e) =>
                                                setEditData({
                                                    ...editData,
                                                    countryCode: e.target.value,
                                                })
                                            }
                                        >
                                            {countries.map((c) => (
                                                <option
                                                    key={c._id}
                                                    value={c.dialCode}
                                                >
                                                    {c.flag} {c.name} (
                                                    {c.dialCode})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            className="dp-input"
                                            value={editData.phone}
                                            onChange={(e) =>
                                                setEditData({
                                                    ...editData,
                                                    phone: e.target.value.replace(
                                                        /\D/g,
                                                        "",
                                                    ),
                                                })
                                            }
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                </div>
                                <div className="dp-field">
                                    <label className="dp-label">
                                        Appointment Phone
                                    </label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <select
                                            className="dp-select"
                                            style={{
                                                width: "auto",
                                                flexShrink: 0,
                                                paddingRight: 28,
                                            }}
                                            value={
                                                editData.countryCode || "+91"
                                            }
                                            onChange={(e) =>
                                                setEditData({
                                                    ...editData,
                                                    countryCode: e.target.value,
                                                })
                                            }
                                        >
                                            {countries.map((c) => (
                                                <option
                                                    key={c._id}
                                                    value={c.dialCode}
                                                >
                                                    {c.flag} {c.name} (
                                                    {c.dialCode})
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            className="dp-input"
                                            name="appointmentphone"
                                            placeholder="Phone number"
                                            value={editData.appointmentPhone}
                                            onChange={(e) =>
                                                setEditData({
                                                    ...editData,
                                                    appointmentPhone:
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            "",
                                                        ),
                                                })
                                            }
                                        />
                                    </div>
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
                                <GraduationCap size={10} /> Qualifications
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
                                        onClick={() => removeDegreeField(index)}
                                        disabled={editData.degree.length === 1}
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
                                <MapPin size={10} /> Medical Center Address
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
                                    <label className="dp-label">State</label>
                                    <input
                                        className="dp-input"
                                        name="state"
                                        value={editData.address.state}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                                <div className="dp-field">
                                    <label className="dp-label">Pincode</label>
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
                            <div style={{ display: "flex", gap: 8 }}>
                                <select
                                    className="dp-input"
                                    style={{ maxWidth: 120 }}
                                    value={editStaffData.countryCode}
                                    onChange={(e) =>
                                        setEditStaffData({
                                            ...editStaffData,
                                            countryCode: e.target.value,
                                        })
                                    }
                                >
                                    {countries.map((c) => (
                                        <option key={c._id} value={c.dialCode}>
                                            {c.dialCode}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    className="dp-input"
                                    placeholder="Enter phone number"
                                    value={editStaffData.phone}
                                    onChange={(e) =>
                                        setEditStaffData({
                                            ...editStaffData,
                                            phone: e.target.value.replace(
                                                /\D/g,
                                                "",
                                            ),
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
                                    <option value="assistant">Assistant</option>
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
                                        <label className="dp-label">End</label>
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
                                                u[index].slotDuration = Number(
                                                    e.target.value,
                                                );
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
                                            letterSpacing: ".08em",
                                            marginBottom: 4,
                                        }}
                                    >
                                        {dayBlock.day}
                                    </div>
                                    {dayBlock.slots.map((slot, si) => (
                                        <div key={si} className="dp-slot-row">
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
                                            setAvailability(editAvailability);
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

            {/* Edit Payment Methods Modal */}
            {editPaymentsOpen && (
                <div
                    className="dp-modal-bg"
                    onClick={() => setEditPaymentsOpen(false)}
                >
                    <div
                        className="dp-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="dp-modal-header">
                            <div className="dp-modal-title">
                                Edit <em>Payment Methods</em>
                            </div>
                            <button
                                className="dp-modal-close"
                                onClick={() => setEditPaymentsOpen(false)}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="dp-modal-body">
                            {paymentMethods.length > 0 && (
                                <>
                                    <div className="dp-modal-section-title">
                                        Existing Methods
                                    </div>
                                    {paymentMethods.map((p, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                padding: "10px 12px",
                                                marginBottom: 8,
                                                borderRadius: 10,
                                                background:
                                                    "rgba(255,255,255,.03)",
                                                border: "1px solid rgba(255,255,255,.06)",
                                                transition: "border-color .15s",
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {p.label || "Unnamed"}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        opacity: 0.45,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    {
                                                        categories.find(
                                                            (c) =>
                                                                c._id?.toString() ===
                                                                p.categoryId?.toString(),
                                                        )?.name
                                                    }
                                                    {" → "}
                                                    {
                                                        subCategories.find(
                                                            (s) =>
                                                                s._id?.toString() ===
                                                                p.subCategoryId?.toString(),
                                                        )?.name
                                                    }
                                                </div>
                                            </div>
                                            <button
                                                className="dp-icon-btn"
                                                title={
                                                    p.isActive
                                                        ? "Deactivate"
                                                        : "Activate"
                                                }
                                                onClick={() => {
                                                    const updated = [
                                                        ...paymentMethods,
                                                    ];
                                                    updated[i] = {
                                                        ...updated[i],
                                                        isActive:
                                                            !updated[i]
                                                                .isActive,
                                                    };
                                                    setPaymentMethods(updated);
                                                }}
                                            >
                                                {p.isActive ? (
                                                    <Eye size={13} />
                                                ) : (
                                                    <EyeOff size={13} />
                                                )}
                                            </button>
                                            <button
                                                className="dp-icon-btn dp-icon-del"
                                                onClick={() =>
                                                    setPaymentMethods(
                                                        paymentMethods.filter(
                                                            (_, idx) =>
                                                                idx !== i,
                                                        ),
                                                    )
                                                }
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="dp-divider" />
                                </>
                            )}
                            <div className="dp-modal-section-title">
                                Add New Method
                            </div>
                            <AddPaymentForm
                                categories={categories}
                                subCategories={subCategories}
                                onAdd={(newMethod) =>
                                    setPaymentMethods((prev) => [
                                        ...prev,
                                        newMethod,
                                    ])
                                }
                            />
                        </div>
                        <div className="dp-modal-footer">
                            <button
                                className="dp-btn dp-btn-outline"
                                onClick={() => setEditPaymentsOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="dp-btn dp-btn-primary"
                                onClick={async () => {
                                    try {
                                        const cleanMethods = paymentMethods.map(
                                            (m) => ({
                                                categoryId:
                                                    m.categoryId?.toString(),
                                                subCategoryId:
                                                    m.subCategoryId?.toString(),
                                                label: m.label || "",
                                                isActive: m.isActive ?? true,
                                            }),
                                        );

                                        const res = await authFetch(
                                            `${API_BASE_URL}/api/doctor/update_payment_methods`,
                                            {
                                                method: "PUT",
                                                headers: {
                                                    "Content-Type":
                                                        "application/json",
                                                },
                                                body: JSON.stringify({
                                                    paymentMethods:
                                                        cleanMethods,
                                                }),
                                            },
                                        );
                                        const data = await res.json();

                                        if (data.success) {
                                            const normalized = (
                                                data.paymentMethods ||
                                                cleanMethods
                                            ).map((m) => ({
                                                ...m,
                                                categoryId:
                                                    m.categoryId?._id?.toString() ||
                                                    m.categoryId?.toString() ||
                                                    "",
                                                subCategoryId:
                                                    m.subCategoryId?._id?.toString() ||
                                                    m.subCategoryId?.toString() ||
                                                    "",
                                                _categoryName:
                                                    categories.find(
                                                        (c) =>
                                                            c._id?.toString() ===
                                                            (m.categoryId?._id?.toString() ||
                                                                m.categoryId?.toString()),
                                                    )?.name || "",
                                                _subCategoryName:
                                                    subCategories.find(
                                                        (s) =>
                                                            s._id?.toString() ===
                                                            (m.subCategoryId?._id?.toString() ||
                                                                m.subCategoryId?.toString()),
                                                    )?.name || "",
                                            }));
                                            setPaymentMethods(normalized);
                                            setEditPaymentsOpen(false);
                                            props.showAlert(
                                                "Updated successfully",
                                                "success",
                                            );
                                        } else
                                            props.showAlert(
                                                data.error || "Update failed",
                                                "danger",
                                            );
                                    } catch (err) {
                                        console.error(err);
                                        props.showAlert(
                                            "Server error",
                                            "danger",
                                        );
                                    }
                                }}
                            >
                                <Check size={13} /> Save All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
