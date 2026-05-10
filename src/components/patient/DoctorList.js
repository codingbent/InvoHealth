import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import DoctorCard from "./DoctorCard";
import "../../css/patient/DoctorList.css";
import { usePatient } from "../../context/PatientContext";
import {
    Folder,
    Mail,
    User,
    File,
    Building2,
    Lock,
    Share2,
    X,
    Facebook,
    MessageCircle,
} from "lucide-react";

/* ── Landing page shown when patient is not logged in ─────────────────────── */
function PatientLanding({ navigate }) {
    return (
        <div className="pld-root">
            {/* Background grid */}
            <div className="pld-bg-grid" aria-hidden="true" />
            <div className="pld-bg-glow" aria-hidden="true" />

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <section className="pld-hero">
                <div className="pld-hero-inner">
                    <div className="pld-pill">
                        <span className="pld-pill-dot" />
                        Patient Portal
                    </div>

                    <h1 className="pld-headline">
                        Your health records,
                        <br />
                        <span className="pld-headline-accent">
                            always with you.
                        </span>
                    </h1>

                    <p className="pld-sub">
                        View appointments, invoices, and stay connected with
                        every doctor you visit — all in one place.
                    </p>

                    <div className="pld-cta-row">
                        <button
                            className="pld-btn-primary"
                            onClick={() => navigate("/patient/login")}
                        >
                            Sign in
                        </button>
                    </div>

                    {/* Trust row */}
                    <div className="pld-trust">
                        <span className="pld-trust-item">
                            <span className="pld-trust-icon">
                                <Lock size={18} />
                            </span>
                            End-to-end encrypted
                        </span>
                        <span className="pld-trust-sep" />
                        <span className="pld-trust-item">
                            <span className="pld-trust-icon">
                                <File size={18} />
                            </span>
                            Instant PDF invoices
                        </span>
                        <span className="pld-trust-sep" />
                        <span className="pld-trust-item">
                            <span className="pld-trust-icon">
                                <Building2 size={18} />
                            </span>
                            Multi-clinic support
                        </span>
                    </div>
                </div>

                {/* Floating mockup card */}
                <div className="pld-mockup" aria-hidden="true">
                    <div className="pld-mock-card">
                        <div className="pld-mock-header">
                            <div className="pld-mock-avatar">A</div>
                            <div>
                                <div className="pld-mock-name">
                                    Dr. Arjun Mehta
                                </div>
                                <div className="pld-mock-spec">
                                    Orthopedics · MBBS, MS
                                </div>
                            </div>
                            <div className="pld-mock-badge">Active</div>
                        </div>
                        <div className="pld-mock-divider" />
                        <div className="pld-mock-row">
                            <span className="pld-mock-label">Last visit</span>
                            <span className="pld-mock-val">24 Apr 2025</span>
                        </div>
                        <div className="pld-mock-row">
                            <span className="pld-mock-label">Invoice</span>
                            <span className="pld-mock-val pld-mock-inv">
                                #INV-042 · ₹1,200
                            </span>
                        </div>
                        <div className="pld-mock-row">
                            <span className="pld-mock-label">Status</span>
                            <span className="pld-mock-paid">Paid</span>
                        </div>
                        <div className="pld-mock-divider" />
                        <div className="pld-mock-footer">
                            <span>
                                <File size={16} /> Download invoice
                            </span>
                            <span>{`>`}</span>
                        </div>
                    </div>

                    {/* Second card peeking behind */}
                    <div className="pld-mock-card-back" />
                </div>
            </section>

            {/* ── FEATURES ─────────────────────────────────────────────────── */}
            <section className="pld-features">
                <div className="pld-features-inner">
                    <h2 className="pld-section-title">
                        Everything in one portal
                    </h2>

                    <div className="pld-feat-grid">
                        <div className="pld-feat-card">
                            <div className="pld-feat-icon pld-feat-icon--blue">
                                <Folder size={18} />
                            </div>
                            <h3 className="pld-feat-title">
                                Full medical history
                            </h3>
                            <p className="pld-feat-desc">
                                Every visit, every service, every invoice —
                                organised chronologically across all your
                                doctors.
                            </p>
                        </div>

                        <div className="pld-feat-card">
                            <div className="pld-feat-icon pld-feat-icon--teal">
                                <Mail size={18} />
                            </div>
                            <h3 className="pld-feat-title">
                                Instant invoice access
                            </h3>
                            <p className="pld-feat-desc">
                                Download or view PDF invoices for any
                                appointment. Sent directly to your email after
                                each visit.
                            </p>
                        </div>

                        <div className="pld-feat-card">
                            <div className="pld-feat-icon pld-feat-icon--purple">
                                <User size={18} />
                            </div>
                            <h3 className="pld-feat-title">
                                Multi-doctor support
                            </h3>
                            <p className="pld-feat-desc">
                                Linked to every clinic you visit. One account,
                                all your doctors — no juggling apps.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA FOOTER ───────────────────────────────────────────────── */}
            <section className="pld-footer-cta">
                <div className="pld-footer-inner">
                    <h2 className="pld-footer-title">Ready to get started?</h2>
                    <p className="pld-footer-sub">
                        Your account is created automatically after your first
                        clinic visit. Use the OTP sent to your phone to log in.
                    </p>
                    <button
                        className="pld-btn-primary pld-btn-lg"
                        onClick={() => navigate("/patient/login")}
                    >
                        Sign in now →
                    </button>
                </div>
            </section>
        </div>
    );
}

/* ── Main DoctorList component ─────────────────────────────────────────────── */
const DoctorList = () => {
    const navigate = useNavigate();
    const { patient, loading: authLoading } = usePatient();
    const [openShare, setOpenShare] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!patient) return;

        const fetchDoctors = async () => {
            try {
                setLoading(true);

                const token = localStorage.getItem("patient_token");

                const res = await fetch(`${API_BASE_URL}/api/patient/doctors`, {
                    headers: {
                        "auth-token": token,
                    },
                });

                const data = await res.json();

                if (data.success) {
                    setDoctors(data.doctors || []);
                }
            } catch {
                setError("Connection error");
            } finally {
                setLoading(false);
            }
        };

        fetchDoctors();

        // ADD THIS (IMPORTANT)
        const onFocus = () => fetchDoctors();
        window.addEventListener("focus", onFocus);

        return () => window.removeEventListener("focus", onFocus);
    }, [patient]);

    if (authLoading) {
        return (
            <div className="dl-page">
                <div className="dl-header">
                    <h2 className="dl-heading">Your Doctors</h2>
                </div>

                <div className="dl-skeleton-grid">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="dl-skeleton-card" />
                    ))}
                </div>
            </div>
        );
    }

    if (!patient) {
        return <PatientLanding navigate={navigate} />;
    }

    if (loading) {
        return (
            <div className="dl-page">
                <div className="dl-header">
                    <h2 className="dl-heading">Your Doctors</h2>
                </div>

                <div className="dl-skeleton-grid">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="dl-skeleton-card" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dl-page">
                <div className="dl-error-card">
                    <p className="dl-error-text">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dl-page">
            <div className="dl-header">
                <h2 className="dl-heading">Your Doctors</h2>
                {doctors.length > 0 && (
                    <span className="dl-count">{doctors.length}</span>
                )}
            </div>

            {/* EMPTY STATE */}
            {!loading && doctors.length === 0 && (
                <div className="dl-empty">
                    <h3 className="dl-empty-title">No doctors linked yet</h3>
                    <p className="dl-empty-sub">
                        Invite your doctor to connect with you
                    </p>
                </div>
            )}

            {/* DOCTOR GRID */}
            <div className="dl-grid">
                {doctors.map((doc) => (
                    <DoctorCard
                        key={doc._id}
                        doc={doc}
                        onClick={() => navigate(`/patient/doctor/${doc._id}`)}
                    />
                ))}
            </div>

            <div className={`dl-fab-wrapper ${openShare ? "open" : ""}`}>
                {openShare && (
                    <div
                        className="dl-fab-backdrop"
                        onClick={() => setOpenShare(false)}
                    />
                )}

                <div className="dl-fab-stack">
                    {/* ACTION BUTTONS */}
                    <div className="dl-fab-actions">
                        <button
                            className="dl-fab-item whatsapp"
                            onClick={() => {
                                const msg = encodeURIComponent(`Hi Doctor,

I’m using InvoHealth to manage my medical records and appointments.

It would be helpful if we could connect there so everything stays organized and easy to access.

https://invohealth.vercel.app/

Thank you!`);
                                window.open(
                                    `https://wa.me/?text=${msg}`,
                                    "_blank",
                                );
                            }}
                        >
                            <MessageCircle size={18} />
                        </button>

                        <button
                            className="dl-fab-item email"
                            onClick={() => {
                                const subject = encodeURIComponent(
                                    "Connecting via InvoHealth",
                                );
                                const body = encodeURIComponent(`Hi Doctor,

I'm using InvoHealth to manage my medical records and appointments.

It would be helpful if we could connect there so everything stays organized and easy to access.

https://invohealth.vercel.app/

Thank you!`);

                                window.location.href = `mailto:?subject=${subject}&body=${body}`;
                            }}
                        >
                            <Mail size={18} />
                        </button>

                        <button
                            className="dl-fab-item facebook"
                            onClick={() => {
                                const url = encodeURIComponent(
                                    "https://invohealth.vercel.app/",
                                );
                                const quote = encodeURIComponent(
                                    "I'm using InvoHealth to manage my medical records and appointments. Doctors can connect with me here.",
                                );

                                window.open(
                                    `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`,
                                    "_blank",
                                );
                            }}
                        >
                            <Facebook size={18} />
                        </button>
                    </div>

                    {/* MAIN BUTTON */}
                    <button
                        className="dl-fab-main"
                        onClick={() => setOpenShare(!openShare)}
                    >
                        {openShare ? <X size={20} /> : <Share2 size={20} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DoctorList;
