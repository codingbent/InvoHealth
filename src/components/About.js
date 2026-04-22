import { useEffect, useRef } from "react";
import {
    Zap,
    Building2,
    Smartphone,
    ShieldCheck,
    Mail,
    Copyright,
    ArrowUpRight,
    Cpu,
    Database,
    FileBarChart,
    Clock,
    CreditCard,
    Users,
} from "lucide-react";
import "../css/About.css"

const features = [
    { icon: Users, text: "Patient profile management" },
    { icon: Clock, text: "Appointment scheduling with time slots" },
    { icon: Database, text: "Appointment & visit history" },
    { icon: FileBarChart, text: "Upload prescriptions, X-rays & reports" },
    { icon: CreditCard, text: "Service-based billing system" },
    { icon: Zap, text: "Discounts (flat & percentage)" },
    { icon: CreditCard, text: "Partial & full payment support" },
    { icon: Cpu, text: "Auto payment status tracking" },
    { icon: FileBarChart, text: "Revenue insights & analytics" },
    { icon: CreditCard, text: "Multiple payment modes" },
    { icon: Database, text: "Advanced filters" },
    { icon: Clock, text: "Day-wise & month-wise income" },
    { icon: FileBarChart, text: "PDF invoice generation" },
    { icon: Database, text: "Excel export" },
    { icon: Smartphone, text: "Fully responsive design" },
    { icon: ShieldCheck, text: "Hassle-free audit records" },
];

const highlights = [
    { icon: Zap, label: "Fast & minimal" },
    { icon: Building2, label: "Clinic-first design" },
    { icon: Smartphone, label: "Mobile & desktop" },
    { icon: ShieldCheck, label: "Encrypted data" },
    { icon: Mail, label: "Gmail notifications" },
];

const stats = [
    { value: "16+", label: "Core features" },
    { value: "100%", label: "Responsive" },
    { value: "AES", label: "Encryption" },
    { value: "Live", label: "Analytics" },
];

function useScrollReveal(className = "ab-reveal") {
    const ref = useRef(null);
    useEffect(() => {
        const els = document.querySelectorAll(`.${className}`);
        const obs = new IntersectionObserver(
            (entries) =>
                entries.forEach((e) => {
                    if (e.isIntersecting)
                        e.target.classList.add(`${className}--in`);
                }),
            { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
        );
        els.forEach((el) => obs.observe(el));
        return () => obs.disconnect();
    }, [className]);
    return ref;
}

export default function About() {
    useScrollReveal("ab-reveal");

    return (
        <div className="ab-root">

            {/* Ambient bg grid */}
            <div className="ab-grid-bg" aria-hidden />
            <div className="ab-glow ab-glow-1" aria-hidden />
            <div className="ab-glow ab-glow-2" aria-hidden />

            {/* ── Hero ── */}
            <section className="ab-hero">
                <div className="ab-badge ab-reveal">
                    <span className="ab-badge-dot" />
                    Medical Center Management System
                </div>

                <h1 className="ab-hero-title ab-reveal">
                    Invo<span>Health</span>
                </h1>

                <p className="ab-hero-sub ab-reveal">
                    A modern clinic management system built for real medical
                    centers. Manage patients, appointments, billing, and medical
                    records — all in one place.
                </p>

                {/* Stats row */}
                <div className="ab-stats ab-reveal">
                    {stats.map((s) => (
                        <div key={s.label} className="ab-stat">
                            <span className="ab-stat-val">{s.value}</span>
                            <span className="ab-stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Highlight pills */}
                <div className="ab-pills ab-reveal">
                    {highlights.map((h) => (
                        <span key={h.label} className="ab-pill">
                            <h.icon size={12} />
                            {h.label}
                        </span>
                    ))}
                </div>
            </section>

            {/* ── Main content ── */}
            <div className="ab-body">
                {/* Overview + Purpose side by side */}
                <div className="ab-row-2">
                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Overview</div>
                        <h2 className="ab-card-title">What is InvoHealth?</h2>
                        <p className="ab-card-text">
                            InvoHealth is a modern clinic management and billing
                            platform designed to streamline daily healthcare
                            operations. It enables doctors and staff to manage
                            patient records, schedule appointments with time
                            slots, upload prescriptions and medical reports, and
                            handle billing — all in one centralized system.
                        </p>
                        <p className="ab-card-text" style={{ marginTop: 12 }}>
                            Built with a clinic-first mindset — every feature
                            exists because a real medical center needed it.
                        </p>
                    </div>

                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Purpose</div>
                        <h2 className="ab-card-title">
                            Built for Real Clinics
                        </h2>
                        <p className="ab-card-text">
                            Designed specifically for private medical centers,
                            InvoHealth reduces manual paperwork and streamlines
                            day-to-day operations. From patient records and
                            medical report uploads to billing and appointment
                            scheduling, it brings efficiency and structure to
                            real-world clinic workflows.
                        </p>
                        <div className="ab-notice ab-notice--amber ab-reveal">
                            <Zap size={13} />
                            Actively evolving based on real clinic needs.
                        </div>
                    </div>
                </div>

                {/* Features full width */}
                <div className="ab-card ab-card--full ab-reveal">
                    <div className="ab-card-tag">Capabilities</div>
                    <h2 className="ab-card-title">Key Features</h2>
                    <div className="ab-features">
                        {features.map((f, i) => (
                            <div
                                key={f.text}
                                className="ab-feature ab-reveal"
                                style={{ transitionDelay: `${i * 0.03}s` }}
                            >
                                <span className="ab-feature-icon">
                                    <f.icon size={13} />
                                </span>
                                <span>{f.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Finance + Security */}
                <div className="ab-row-2">
                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Finance</div>
                        <h2 className="ab-card-title">Billing & Payments</h2>
                        <p className="ab-card-text">
                            Clean financial records for CA review and tax
                            filing. Supports Indian and international clinics
                            with region-aware payment processing.
                        </p>
                        <ul className="ab-list">
                            <li>Razorpay — India (UPI, cards, net banking)</li>
                            <li>International payment gateway support</li>
                            <li>Monthly & yearly revenue tracking</li>
                            <li>Excel export for CA / accountant</li>
                        </ul>
                        <div
                            className="ab-notice ab-notice--blue"
                            style={{ marginTop: 14 }}
                        >
                            <ShieldCheck size={13} />
                            Consult a CA for final filings. Payment providers
                            handle transaction security independently.
                        </div>
                    </div>

                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Security</div>
                        <h2 className="ab-card-title">Access Control</h2>
                        <p className="ab-card-text">
                            Advanced security with encrypted sensitive data,
                            token-based authentication, and role-based access
                            control. Phone numbers are securely hashed and
                            encrypted — never stored in plain text. Emails sent
                            via Gmail API with send-only access; your inbox is
                            never read or stored.
                        </p>
                        <ul className="ab-list" style={{ marginTop: 12 }}>
                            <li>Token-based authentication (JWT)</li>
                            <li>Role-based permissions (doctor / staff)</li>
                            <li>AES-encrypted phone & sensitive data</li>
                            <li>Gmail API — send-only, no inbox access</li>
                        </ul>
                    </div>
                </div>

                {/* Contact + Developer */}
                <div className="ab-row-2">
                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Support</div>
                        <h2 className="ab-card-title">Contact</h2>
                        <p className="ab-card-text">
                            Feedback and support enquiries:
                        </p>
                        <a
                            href="mailto:invohealth.app@gmail.com"
                            className="ab-contact"
                        >
                            <Mail size={15} />
                            invohealth.app@gmail.com
                            <ArrowUpRight
                                size={13}
                                style={{ marginLeft: "auto" }}
                            />
                        </a>
                    </div>

                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Developer</div>
                        <h2 className="ab-card-title">Built by</h2>
                        <p className="ab-card-text">
                            <span className="ab-dev-name">Abhed Agarwal</span>
                        </p>
                        <p className="ab-card-text" style={{ marginTop: 8 }}>
                            Focused on building practical, real-world software
                            solutions that simplify everyday workflows for
                            healthcare professionals.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="ab-footer ab-reveal">
                <span className="ab-footer-copy">
                    <Copyright size={13} /> {new Date().getFullYear()}{" "}
                    InvoHealth. All rights reserved.
                </span>
                <span className="ab-version">
                    v{process.env.REACT_APP_VERSION}
                </span>
            </footer>
        </div>
    );
}
