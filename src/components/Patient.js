import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useLocation } from "react-router-dom";
import AddServices from "./AddServices";
import AddPatient from "./AddPatient";
import PatientList from "./PatientList";
import AddAppointment from "./AddAppointment";
import PatientDetails from "./PatientDetails";
import EditService from "./EditService";
import {
    Plus,
    UserPlus,
    FileText,
    CalendarPlus,
    Pencil,
    X,
    ShieldCheck,
    BarChart3,
    CalendarDays,
    Folder,
    CreditCard,
    ChevronRight,
    User,
    Mail,
    Globe,
    Clock,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    ArrowRight,
    Zap,
    Stethoscope,
    Sparkles,
    Bone,
    Eye,
    Heart,
    MoveRight,
} from "lucide-react";
import { motion } from "framer-motion";
import Pricing from "./Pricing";
import { API_BASE_URL } from "../components/config";
import "../css/Landingpage.css";

// ── Specialty wedges ───────────────────────────────────────────────────────
const SPECIALTIES = [
    {
        icon: <Stethoscope size={15} />,
        label: "General Physician OPD",
        color: "#a78bfa",
    },
    {
        icon: <Sparkles size={15} />,
        label: "Dermatology & Skin Clinics",
        color: "#38bdf8",
    },
    { icon: <Bone size={15} />, label: "Orthopaedic OPD", color: "#34d399" },
    {
        icon: <Eye size={15} />,
        label: "Ophthalmology Clinics",
        color: "#fb923c",
    },
    {
        icon: <Heart size={15} />,
        label: "Cardiology Follow-up Clinics",
        color: "#f87171",
    },
    { icon: <User size={15} />, label: "Dental Clinics", color: "#f59e0b" },
];

// ── Switching economics ────────────────────────────────────────────────────
const ECONOMICS = [
    {
        metric: "2–3 hrs",
        label: "back in your day",
        desc: "Front desk stops manually billing, filing and chasing dues. That time goes back to patients.",
        color: "#34d399",
    },
    {
        metric: "No more",
        label: "forgotten partial payments",
        desc: "Every due is tracked automatically and visible to staff. Nothing falls through the cracks.",
        color: "#a78bfa",
    },
    {
        metric: "1 system",
        label: "replaces 4 tools",
        desc: "Patient register + Excel billing + paper files + WhatsApp reminders — all in one place.",
        color: "#38bdf8",
    },
    {
        metric: "Free",
        label: "migration included",
        desc: "We import your existing patient data and service list. You don't touch a single row of Excel.",
        color: "#fb923c",
    },
];

// ── Workflow steps ────────────────────────────────────────────────────────
const WORKFLOW = [
    {
        step: "01",
        title: "Patient walks in",
        desc: "Search by name or phone. Full history, last visit, open dues — visible in under 5 seconds.",
        color: "#a78bfa",
    },
    {
        step: "02",
        title: "Add appointment",
        desc: "Pick a time slot. Gmail reminder sent automatically. No calls, no manual follow-up.",
        color: "#38bdf8",
    },
    {
        step: "03",
        title: "Generates invoice",
        desc: "Select services, apply discount, choose payment mode. PDF invoice ready in one click.",
        color: "#34d399",
    },
    {
        step: "04",
        title: "Invoice sent automatically",
        desc: "Patient receives visit summary and invoice instantly via email.",
        color: "#22c55e",
    },
    {
        step: "05",
        title: "Track dues",
        desc: "Partial payments tracked automatically. Staff see exactly what's owed — per patient, per day.",
        color: "#fb923c",
    },
    {
        step: "06",
        title: "Revenue report",
        desc: "Day-wise and month-wise income at a glance. Export to Excel for your CA instantly.",
        color: "#f59e0b",
    },
];

// ── Outcome-first features ──────────────────────────────────────────────────
const FEATURES = [
    {
        name: "Fast Patient Lookup",
        desc: "Pull up any patient's full history, last visit, and open dues the moment they walk in. No paper flipping.",
        icon: <Clock size={18} />,
        color: "#a78bfa",
        bg: "rgba(167,139,250,0.1)",
        border: "rgba(167,139,250,0.3)",
        glow: "rgba(167,139,250,0.6)",
    },
    {
        name: "Fewer Missed Follow-ups",
        desc: "Appointment reminders go out automatically via Gmail. Patients show up. Staff stop making manual reminder calls.",
        icon: <CalendarDays size={18} />,
        color: "#38bdf8",
        bg: "rgba(56,189,248,0.1)",
        border: "rgba(56,189,248,0.3)",
        glow: "rgba(56,189,248,0.6)",
    },
    {
        name: "No More Forgotten Dues",
        desc: "Every unpaid balance is tracked automatically. Staff see open dues at a glance — no more chasing patients.",
        icon: <CreditCard size={18} />,
        color: "#34d399",
        bg: "rgba(52,211,153,0.1)",
        border: "rgba(52,211,153,0.3)",
        glow: "rgba(52,211,153,0.6)",
    },
    {
        name: "Revenue Reports, Instantly",
        desc: "Day-wise and month-wise income ready to share with your CA. No manual tallying, no end-of-month panic.",
        icon: <BarChart3 size={18} />,
        color: "#f87171",
        bg: "rgba(248,113,113,0.1)",
        border: "rgba(248,113,113,0.3)",
        glow: "rgba(248,113,113,0.6)",
    },
    {
        name: "All Records in One Place",
        desc: "Prescriptions, X-rays, lab reports and visit notes — stored digitally, searchable in seconds.",
        icon: <Folder size={18} />,
        color: "#60a5fa",
        bg: "rgba(96,165,250,0.1)",
        border: "rgba(96,165,250,0.3)",
        glow: "rgba(96,165,250,0.6)",
    },
    {
        name: "Less Chaos at Front Desk",
        desc: "Billing, booking and patient registration happen in the same workflow. Fewer steps, fewer errors.",
        icon: <TrendingUp size={18} />,
        color: "#fb923c",
        bg: "rgba(251,146,60,0.1)",
        border: "rgba(251,146,60,0.3)",
        glow: "rgba(251,146,60,0.6)",
    },
    {
        name: "Role-Based Staff Access",
        desc: "Receptionists see what they need. Doctors get the full picture. Data stays secure without slowing anyone down.",
        icon: <User size={18} />,
        color: "#c084fc",
        bg: "rgba(192,132,252,0.1)",
        border: "rgba(192,132,252,0.3)",
        glow: "rgba(192,132,252,0.6)",
    },
    {
        name: "Invoice in Under a Minute",
        desc: "Service-based billing with discounts, multiple payment modes and instant PDF invoices. No calculator needed.",
        icon: <FileText size={18} />,
        color: "#f59e0b",
        bg: "rgba(245,158,11,0.1)",
        border: "rgba(245,158,11,0.3)",
        glow: "rgba(245,158,11,0.6)",
    },
    {
        name: "Automatic Invoice Emails",
        desc: "After every appointment, patients automatically receive their visit summary and invoice via email. No manual sending needed.",
        icon: <Mail size={18} />,
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.1)",
        border: "rgba(59,130,246,0.3)",
        glow: "rgba(59,130,246,0.4)",
    },
];

// ── Pain points this replaces ───────────────────────────────────────────────
const PAIN_POINTS = [
    {
        old: "Excel spreadsheets for patient records",
        icon: <AlertCircle size={14} />,
    },
    {
        old: "Paper prescriptions lost in files",
        icon: <AlertCircle size={14} />,
    },
    { old: "Manual billing with calculators", icon: <AlertCircle size={14} /> },
    {
        old: "WhatsApp for appointment reminders",
        icon: <AlertCircle size={14} />,
    },
    {
        old: "Partial payments forgotten or missed",
        icon: <AlertCircle size={14} />,
    },
    {
        old: "Month-end revenue tallied manually",
        icon: <AlertCircle size={14} />,
    },
];

const Patient = ({
    showAlert,
    currency,
    usage,
    doctor,
    services,
    availability,
    country,
}) => {
    const [role, setRole] = useState(null);
    //eslint-disable-next-line
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [showAppointment, setShowAppointment] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [fabOpen, setFabOpen] = useState(false);
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [showEditServiceModal, setShowEditServiceModal] = useState(false);
    // eslint-disable-next-line
    const [subscription, setSubscription] = useState(null);

    const Modal = ({ isOpen, onClose, children }) => {
        if (!isOpen) return null;
        return (
            <div className="modal-backdrop" onClick={onClose}>
                <div
                    className="modal-container"
                    onClick={(e) => e.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        );
    };

    const location = useLocation();

    useEffect(() => {
        if (location.hash === "#pricing") {
            const el = document.getElementById("pricing");
            if (el) {
                setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth" });
                }, 1000);
            }
        }
    }, [location]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const decoded = jwtDecode(token);
            setRole(decoded.user.role);
        } catch {
            setRole(null);
        }
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        fetch(`${API_BASE_URL}/api/doctor/subscription`, {
            headers: { "auth-token": token },
        })
            .then((res) => res.json())
            .then((data) => {
                if (!data.success) {
                    setSubscriptionStatus("expired");
                    return;
                }

                const sub = data.subscription;
                const now = new Date();
                const expiry = sub.expiryDate ? new Date(sub.expiryDate) : null;

                if (expiry && expiry <= now) {
                    setSubscriptionStatus("expired");
                } else {
                    setSubscriptionStatus(sub.status || "active");
                }
            })
            .catch(() => {
                setSubscriptionStatus(null);
            });
    }, []);

    const closeAppointment = () => {
        setShowAppointment(false);
        localStorage.removeItem("patient");
    };
    const openPatientDetails = (id) => {
        setSelectedPatientId(id);
        setShowPatientDetails(true);
    };
    const closePatientDetails = () => {
        setShowPatientDetails(false);
        setSelectedPatientId(null);
    };

    // ── Landing (not logged in) ──────────────────────────────────────────────
    if (!localStorage.getItem("token")) {
        return (
            <>
                <motion.div
                    className="lp-root"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    {/* ── Hero ── */}
                    <section className="lp-hero">
                        <div className="lp-badge">
                            <Zap size={11} /> Built for repeat-visit OPD &amp;
                            dermatology clinics
                        </div>

                        <h1 className="lp-h1">
                            Replace patient registers,
                            <br />
                            Excel &amp; paper files.
                            <br />
                            <em>One workflow. Every visit.</em>
                        </h1>

                        <p className="lp-sub">
                            InvoHealth helps small private clinics manage
                            check-in, billing, records and dues — without
                            touching a spreadsheet or a paper file ever again.
                            We set up your clinic and migrate your data for
                            free.
                        </p>

                        <div className="lp-hero-btns">
                            <a className="lp-btn-hero" href="#pricing">Start a Free Trial</a>
                            <Link to="/login" className="lp-btn-ghost">
                                Log in
                            </Link>
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* ── Pain — what they're currently doing ── */}
                    <section className="lp-pain-section">
                        <div className="lp-section-eyebrow">
                            Sound familiar?
                        </div>
                        <h2 className="lp-section-title">
                            If your clinic still runs on <em>this</em>…
                        </h2>
                        <div className="lp-pain-grid">
                            {PAIN_POINTS.map((p) => (
                                <div key={p.old} className="lp-pain-card">
                                    <span className="lp-pain-icon">
                                        {p.icon}
                                    </span>
                                    <span className="lp-pain-text">
                                        {p.old}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="lp-pain-cta">
                            <ArrowRight size={14} />
                            <span>InvoHealth replaces all of it.</span>
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* ── Workflow — how a visit actually works ── */}
                    <section className="lp-workflow-section">
                        <div className="lp-section-eyebrow">How it works</div>
                        <h2 className="lp-section-title">
                            One visit. <em>Five steps. One screen.</em>
                        </h2>
                        <div className="lp-workflow-track">
                            {WORKFLOW.map((w, i) => (
                                <div key={w.step} className="lp-workflow-node">
                                    <div
                                        className="lp-wf-step-num"
                                        style={{
                                            color: w.color,
                                            borderColor: w.color + "44",
                                        }}
                                    >
                                        {w.step}
                                    </div>
                                    <div className="lp-wf-title">{w.title}</div>
                                    <div className="lp-wf-desc">{w.desc}</div>
                                    {i < WORKFLOW.length - 1 && (
                                        <div className="lp-wf-connector" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* ── Migration promise ── */}
                    <section className="lp-migration-section">
                        <div className="lp-migration-inner">
                            <div className="lp-migration-badge">
                                <CheckCircle2 size={13} /> Free Migration
                                Included
                            </div>
                            <h2 className="lp-migration-title">
                                "Moving from Excel sounds like a lot of work."
                            </h2>
                            <p className="lp-migration-body">
                                We hear this from every clinic. So we do the
                                work for you.
                            </p>
                            <div className="lp-migration-steps">
                                <div className="lp-migration-step">
                                    <span className="lp-mig-num">1</span>
                                    <div>
                                        <div className="lp-mig-title">
                                            Share your records
                                        </div>
                                        <div className="lp-mig-desc">
                                            Send your Excel patient list and
                                            service rates. Any format works.
                                        </div>
                                    </div>
                                </div>
                                <MoveRight size={18} className="lp-mig-arrow" />
                                <div className="lp-migration-step">
                                    <span className="lp-mig-num">2</span>
                                    <div>
                                        <div className="lp-mig-title">
                                            We import everything
                                        </div>
                                        <div className="lp-mig-desc">
                                            Patient profiles, service list,
                                            pricing — migrated by us, free of
                                            charge.
                                        </div>
                                    </div>
                                </div>
                                <MoveRight size={18} className="lp-mig-arrow" />
                                <div className="lp-migration-step">
                                    <span className="lp-mig-num">3</span>
                                    <div>
                                        <div className="lp-mig-title">
                                            Your clinic goes live
                                        </div>
                                        <div className="lp-mig-desc">
                                            Usually within a day. Staff are
                                            trained. You're running.
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="lp-migration-cta">
                                <a
                                    href="mailto:invohealth.app@gmail.com?subject=Clinic Setup Demo Request"
                                    className="lp-btn-hero"
                                    style={{ fontSize: "0.82rem" }}
                                >
                                    Book a Free Setup Demo — we'll handle the
                                    rest <ChevronRight size={12} />
                                </a>
                            </div>
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* ── Switching economics ── */}
                    <section className="lp-economics-section">
                        <div className="lp-section-eyebrow">
                            Why clinics switch
                        </div>
                        <h2 className="lp-section-title">
                            What your clinic <em>actually gains</em>
                        </h2>
                        <div className="lp-economics-grid">
                            {ECONOMICS.map((e) => (
                                <div key={e.metric} className="lp-econ-card">
                                    <div
                                        className="lp-econ-metric"
                                        style={{ color: e.color }}
                                    >
                                        {e.metric}
                                    </div>
                                    <div className="lp-econ-label">
                                        {e.label}
                                    </div>
                                    <div className="lp-econ-desc">{e.desc}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* ── Testimonials / trust proof ── */}
                    {/* <section className="lp-testimonial-section">
                        <div className="lp-section-eyebrow">
                            From clinics using InvoHealth
                        </div>
                        <h2 className="lp-section-title">
                            What doctors &amp; staff <em>actually say</em>
                        </h2>
                        <div className="lp-testimonial-grid">
                            <div className="lp-testimonial-card">
                                <div className="lp-testimonial-quote">
                                    "We stopped using Excel within two days.
                                    Billing is faster and we stopped losing
                                    track of partial payments entirely."
                                </div>
                                <div className="lp-testimonial-author">
                                    <div className="lp-testimonial-avatar">
                                        D
                                    </div>
                                    <div>
                                        <div className="lp-testimonial-name">
                                            Dr. Sharma
                                        </div>
                                        <div className="lp-testimonial-role">
                                            General Physician, Delhi
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="lp-testimonial-card">
                                <div className="lp-testimonial-quote">
                                    "My receptionist used to spend an hour every
                                    evening on billing. Now it's 10 minutes.
                                    Patient records are finally in one place."
                                </div>
                                <div className="lp-testimonial-author">
                                    <div className="lp-testimonial-avatar">
                                        P
                                    </div>
                                    <div>
                                        <div className="lp-testimonial-name">
                                            Dr. Priya Nair
                                        </div>
                                        <div className="lp-testimonial-role">
                                            Dermatology Clinic, Bangalore
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="lp-testimonial-card">
                                <div className="lp-testimonial-quote">
                                    "The migration was handled completely by
                                    them. I just gave them my Excel file and two
                                    days later we were live."
                                </div>
                                <div className="lp-testimonial-author">
                                    <div className="lp-testimonial-avatar">
                                        R
                                    </div>
                                    <div>
                                        <div className="lp-testimonial-name">
                                            Dr. Rajan
                                        </div>
                                        <div className="lp-testimonial-role">
                                            Orthopaedic OPD, Mumbai
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <p className="lp-testimonial-note">
                            ✦ Names changed for privacy. Available for
                            verification on request.
                        </p>
                    </section> */}

                    <div className="lp-divider" />

                    {/* ── Specialty wedge ── */}
                    <section className="lp-specialty-section">
                        <div className="lp-section-eyebrow">Specialties</div>
                        <h2 className="lp-section-title">
                            Works especially well for{" "}
                            <em>repeat-visit clinics</em>
                        </h2>
                        <p className="lp-section-sub">
                            High repeat-patient volume is where InvoHealth
                            shines most — instant history lookup, dues tracking,
                            and follow-up reminders built around how OPD
                            actually works.
                        </p>
                        <div className="lp-specialty-grid">
                            {SPECIALTIES.map((s) => (
                                <div
                                    key={s.label}
                                    className="lp-specialty-pill"
                                    style={{ "--sp-color": s.color }}
                                >
                                    <span className="lp-specialty-icon">
                                        {s.icon}
                                    </span>
                                    <span>{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* ── Pricing ── */}
                    <div id="pricing">
                        <Pricing />
                    </div>

                    <div className="lp-divider" />

                    {/* Trust strip */}
                    <div className="lp-trust-strip">
                        <span className="lp-trust-item">
                            <ShieldCheck size={13} /> Encrypted patient data
                        </span>
                        <span className="lp-trust-dot" />
                        <span className="lp-trust-item">
                            <span className="lp-trust-item">
                                <Mail size={13} /> Automatic invoice emails to
                                patients
                            </span>
                        </span>
                        <span className="lp-trust-dot" />
                        <span className="lp-trust-item">
                            <CreditCard size={13} /> Razorpay &amp;
                            international payments
                        </span>
                        <span className="lp-trust-dot" />
                        <span className="lp-trust-item">
                            <Globe size={13} /> Works worldwide
                        </span>
                    </div>

                    {/* ── Features (below pricing — for those who scroll) ── */}
                    <section className="lp-features">
                        <div className="lp-section-eyebrow">
                            What's included
                        </div>
                        <h2 className="lp-section-title">
                            Everything your clinic needs
                        </h2>
                        <div className="lp-feat-grid">
                            {FEATURES.map((f) => (
                                <div key={f.name} className="lp-feat-card">
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: 0,
                                            left: "10%",
                                            right: "10%",
                                            height: 1,
                                            background: `linear-gradient(90deg, transparent, ${f.glow}, transparent)`,
                                        }}
                                    />
                                    <div
                                        className="lp-feat-icon"
                                        style={{
                                            background: f.bg,
                                            border: `1px solid ${f.border}`,
                                            color: f.color,
                                        }}
                                    >
                                        {f.icon}
                                    </div>
                                    <div className="lp-feat-name">{f.name}</div>
                                    <div className="lp-feat-desc">{f.desc}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="lp-divider" />

                    {/* ── Who it's for ── */}
                    <section className="lp-who-section">
                        <div className="lp-section-eyebrow">Built for</div>
                        <h2 className="lp-section-title">
                            Specifically designed for{" "}
                            <em>small private clinics</em>
                        </h2>
                        <div className="lp-who-grid">
                            <div className="lp-who-card">
                                <CheckCircle2
                                    size={16}
                                    className="lp-who-check"
                                />
                                <div>
                                    <div className="lp-who-title">
                                        1–5 doctor clinics
                                    </div>
                                    <div className="lp-who-desc">
                                        Not built for hospitals. Built for
                                        private clinics where staff wear
                                        multiple hats and every minute counts.
                                    </div>
                                </div>
                            </div>
                            <div className="lp-who-card">
                                <CheckCircle2
                                    size={16}
                                    className="lp-who-check"
                                />
                                <div>
                                    <div className="lp-who-title">
                                        High repeat-patient volume
                                    </div>
                                    <div className="lp-who-desc">
                                        Patient history, past prescriptions and
                                        dues always one search away — critical
                                        when the same patient returns every
                                        month.
                                    </div>
                                </div>
                            </div>
                            <div className="lp-who-card">
                                <CheckCircle2
                                    size={16}
                                    className="lp-who-check"
                                />
                                <div>
                                    <div className="lp-who-title">
                                        Currently on Excel or paper
                                    </div>
                                    <div className="lp-who-desc">
                                        Managing billing on spreadsheets or
                                        writing invoices by hand? We migrate
                                        your data for free and have you live
                                        within a day.
                                    </div>
                                </div>
                            </div>
                            <div className="lp-who-card">
                                <CheckCircle2
                                    size={16}
                                    className="lp-who-check"
                                />
                                <div>
                                    <div className="lp-who-title">
                                        India &amp; international clinics
                                    </div>
                                    <div className="lp-who-desc">
                                        Razorpay for Indian payments (UPI,
                                        cards, net banking) plus international
                                        gateway support. GST-ready invoices
                                        included.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </motion.div>
            </>
        );
    }

    // ── Logged in ──────────────────────────────────────────────────────────────
    return (
        <>
            {!showAppointment && !showPatientDetails && (
                <>
                    {fabOpen && (
                        <div
                            className="fab-backdrop"
                            onClick={() => setFabOpen(false)}
                        />
                    )}

                    <div className={`fab-container ${fabOpen ? "open" : ""}`}>
                        <button
                            className={`fab-main ${fabOpen ? "open" : ""}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setFabOpen(!fabOpen);
                            }}
                        >
                            <Plus size={22} />
                        </button>

                        <button
                            className={`fab-item ${fabOpen ? "show" : ""}`}
                            style={{ "--i": 1 }}
                            onClick={() => {
                                if (
                                    subscriptionStatus !== null &&
                                    subscriptionStatus !== "active"
                                ) {
                                    showAlert(
                                        "Please upgrade your plan to continue.",
                                        "danger",
                                    );
                                    return;
                                }
                                setFabOpen(false);
                                setShowPatientModal(true);
                            }}
                        >
                            <UserPlus size={16} />
                            <span>Add Patient</span>
                        </button>

                        <button
                            className={`fab-item ${fabOpen ? "show" : ""}`}
                            style={{ "--i": 2 }}
                            onClick={() => {
                                if (
                                    subscriptionStatus !== null &&
                                    subscriptionStatus !== "active"
                                ) {
                                    showAlert(
                                        "Please upgrade your plan to continue.",
                                        "danger",
                                    );
                                    return;
                                }
                                setFabOpen(false);
                                setShowAppointment(true);
                            }}
                        >
                            <CalendarPlus size={16} />
                            <span>Add Appointment</span>
                        </button>

                        {role === "doctor" && (
                            <button
                                className={`fab-item ${fabOpen ? "show" : ""}`}
                                style={{ "--i": 3 }}
                                onClick={() => {
                                    if (
                                        subscriptionStatus !== null &&
                                        subscriptionStatus !== "active"
                                    ) {
                                        showAlert(
                                            "Please upgrade your plan to continue.",
                                            "danger",
                                        );
                                        return;
                                    }
                                    setFabOpen(false);
                                    setShowServiceModal(true);
                                }}
                            >
                                <FileText size={16} />
                                <span>Add Service</span>
                            </button>
                        )}

                        {role === "doctor" && (
                            <button
                                className={`fab-item ${fabOpen ? "show" : ""}`}
                                style={{ "--i": 4 }}
                                onClick={() => {
                                    if (
                                        subscriptionStatus !== null &&
                                        subscriptionStatus !== "active"
                                    ) {
                                        showAlert(
                                            "Please upgrade your plan to continue.",
                                            "danger",
                                        );
                                        return;
                                    }
                                    setFabOpen(false);
                                    setShowEditServiceModal(true);
                                }}
                            >
                                <Pencil size={16} />
                                <span>Edit Service</span>
                            </button>
                        )}
                    </div>
                </>
            )}

            <Modal
                isOpen={showPatientModal}
                onClose={() => setShowPatientModal(false)}
            >
                <AddPatient
                    showAlert={showAlert}
                    showModal={showPatientModal}
                    setShowModal={setShowPatientModal}
                    currency={currency}
                    usage={usage}
                    doctor={doctor}
                    services={services}
                    availability={availability}
                />
            </Modal>
            <Modal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
            >
                <AddServices
                    showAlert={showAlert}
                    currency={currency}
                    onClose={() => setShowServiceModal(false)}
                />
            </Modal>
            <Modal
                isOpen={showEditServiceModal}
                onClose={() => setShowEditServiceModal(false)}
            >
                <EditService
                    showAlert={showAlert}
                    currency={currency}
                    onClose={() => setShowEditServiceModal(false)}
                />
            </Modal>

            <div className="app-page">
                {!showAppointment && !showPatientDetails && (
                    <PatientList
                        showAlert={showAlert}
                        currency={currency}
                        openPatientDetails={openPatientDetails}
                        country={country}
                    />
                )}
                {showAppointment && (
                    <div className="app-section">
                        <AddAppointment
                            showAlert={showAlert}
                            currency={currency}
                            usage={usage}
                            services={services}
                            availability={availability}
                        />
                        <button
                            className="app-close-btn"
                            onClick={closeAppointment}
                        >
                            <X size={14} /> Close
                        </button>
                    </div>
                )}
                {showPatientDetails && selectedPatientId && (
                    <div className="app-section">
                        <PatientDetails
                            currency={currency}
                            patientId={selectedPatientId}
                            showAlert={showAlert}
                            services={services}
                            availability={availability}
                            onClose={closePatientDetails}
                        />
                    </div>
                )}
            </div>
        </>
    );
};

export default Patient;
