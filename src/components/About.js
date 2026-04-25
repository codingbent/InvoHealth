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
    TrendingUp,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import "../css/About.css";

const features = [
    { icon: Users, text: "Patient profile management & visit history" },
    { icon: Clock, text: "Fast patient lookup by name or phone" },
    { icon: Database, text: "Full appointment & OPD visit history" },
    { icon: FileBarChart, text: "Upload prescriptions, X-rays & lab reports" },
    { icon: CreditCard, text: "Service-based billing with discounts" },
    { icon: Zap, text: "Flat & percentage discount support" },
    { icon: CreditCard, text: "Partial & full payment tracking" },
    { icon: Cpu, text: "Auto payment status — dues tracked automatically" },
    { icon: TrendingUp, text: "Revenue insights & day/month analytics" },
    { icon: CreditCard, text: "Multiple payment modes supported" },
    { icon: Database, text: "Advanced patient & appointment filters" },
    { icon: Clock, text: "Day-wise & month-wise income reports" },
    { icon: FileBarChart, text: "PDF invoice generation in 1 click" },
    { icon: Database, text: "Excel export for CA / accountant" },
    { icon: Smartphone, text: "Fully responsive — works on any device" },
    { icon: ShieldCheck, text: "Audit-ready records, always clean" },
    { icon: Mail, text: "Automatic invoice emails after every appointment" },
];

const highlights = [
    { icon: Zap, label: "Fast & minimal" },
    { icon: Building2, label: "Clinic-first design" },
    { icon: Smartphone, label: "Mobile & desktop" },
    { icon: ShieldCheck, label: "Encrypted data" },
    { icon: Mail, label: "Gmail notifications" },
];

const stats = [
    { value: "Fast", label: "Patient lookup" },
    { value: "1-click", label: "Revenue reports" },
    { value: "AES", label: "Encryption" },
    { value: "Free", label: "Migration" },
];

const replaces = [
    { icon: AlertCircle, text: "Excel spreadsheets for patient records" },
    { icon: AlertCircle, text: "Paper prescriptions lost in files" },
    { icon: AlertCircle, text: "Manual billing with calculators" },
    { icon: AlertCircle, text: "WhatsApp / calls for appointment reminders" },
    { icon: AlertCircle, text: "Partial payments forgotten or missed" },
    { icon: AlertCircle, text: "Month-end revenue tallied manually" },
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
            <div className="ab-grid-bg" aria-hidden />
            <div className="ab-glow ab-glow-1" aria-hidden />
            <div className="ab-glow ab-glow-2" aria-hidden />

            {/* ── Hero ── */}
            <section className="ab-hero">
                <div className="ab-badge ab-reveal">
                    <span className="ab-badge-dot" />
                    Built for small private clinics
                </div>

                <h1 className="ab-hero-title ab-reveal">
                    Invo<span>Health</span>
                </h1>

                <p className="ab-hero-sub ab-reveal">
                    InvoHealth replaces Excel sheets, paper records and manual
                    billing with a single workflow — from patient check-in to
                    invoice generation — designed for how clinics actually run.
                </p>

                <div className="ab-stats ab-reveal">
                    {stats.map((s) => (
                        <div key={s.label} className="ab-stat">
                            <span className="ab-stat-val">{s.value}</span>
                            <span className="ab-stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>

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
                {/* Overview + Who it's for */}
                <div className="ab-row-2">
                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Overview</div>
                        <h2 className="ab-card-title">What is InvoHealth?</h2>
                        <p className="ab-card-text">
                            InvoHealth is a clinic management and billing
                            platform built specifically for small private
                            clinics with 1-5 doctors. It handles patient
                            records, appointment scheduling, prescriptions,
                            medical report storage and billing — all in one
                            place.Invoices are automatically generated and sent
                            to patients after every visit, ensuring records are
                            always shared and documented.
                        </p>
                        <p className="ab-card-text" style={{ marginTop: 12 }}>
                            Every feature exists because a real clinic needed
                            it. Nothing bloated, nothing unnecessary.
                        </p>
                    </div>

                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Who it's for</div>
                        <h2 className="ab-card-title">
                            Clinics on Excel or Paper
                        </h2>
                        <p className="ab-card-text">
                            If your clinic manages patients on spreadsheets,
                            writes invoices by hand or tracks dues in a notebook
                            — InvoHealth is built for you. Staff get a single
                            system that covers check-in, billing and records
                            without switching between tools.
                        </p>
                        <div
                            className="ab-notice ab-notice--amber ab-reveal"
                            style={{ marginTop: 16 }}
                        >
                            <Zap size={13} />
                            Actively evolving based on real clinic feedback.
                        </div>
                    </div>
                </div>

                {/* What it replaces */}
                <div className="ab-card ab-card--full ab-reveal">
                    <div className="ab-card-tag">Replaces</div>
                    <h2 className="ab-card-title">
                        What InvoHealth gets rid of
                    </h2>
                    <p className="ab-card-text" style={{ marginBottom: 20 }}>
                        Clinics that switch to InvoHealth stop relying on all of
                        the following:
                    </p>
                    <div className="ab-features">
                        {replaces.map((r, i) => (
                            <div
                                key={r.text}
                                className="ab-feature ab-reveal"
                                style={{ transitionDelay: `${i * 0.04}s` }}
                            >
                                <span
                                    className="ab-feature-icon"
                                    style={{
                                        color: "#f87171",
                                        background: "rgba(248,113,113,0.1)",
                                        border: "1px solid rgba(248,113,113,0.3)",
                                    }}
                                >
                                    <r.icon size={13} />
                                </span>
                                <span>{r.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features full width */}
                <div className="ab-card ab-card--full ab-reveal">
                    <div className="ab-card-tag">Capabilities</div>
                    <h2 className="ab-card-title">
                        Everything inside InvoHealth
                    </h2>
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
                        <h2 className="ab-card-title">
                            Billing & Revenue Tracking
                        </h2>
                        <p className="ab-card-text">
                            Every invoice, payment and outstanding due is
                            tracked automatically. Revenue reports are ready in
                            one click — no more end-of-month tallying. Export to
                            Excel for your CA with a single button.
                        </p>
                        <ul className="ab-list">
                            <li>Razorpay — India (UPI, cards, net banking)</li>
                            <li>International payment gateway support</li>
                            <li>GST-ready invoice generation</li>
                            <li>Excel export for CA / accountant review</li>
                            <li>Partial dues tracked automatically</li>
                            <li>
                                Invoices automatically sent to patients via
                                email
                            </li>
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
                        <h2 className="ab-card-title">
                            Built-in Access Control
                        </h2>
                        <p className="ab-card-text">
                            Sensitive patient data is AES-encrypted and never
                            stored in plain text. Staff see only what they need.
                            Doctors get the full picture. Gmail integration uses
                            send-only API access — your inbox is never read or
                            stored.
                        </p>
                        <ul className="ab-list" style={{ marginTop: 12 }}>
                            <li>JWT token-based authentication</li>
                            <li>Role-based permissions (doctor / staff)</li>
                            <li>
                                AES-encrypted phone numbers & sensitive data
                            </li>
                            <li>Gmail API — send-only, no inbox access ever</li>
                        </ul>
                        <div
                            className="ab-notice ab-notice--amber"
                            style={{ marginTop: 14 }}
                        >
                            <CheckCircle2 size={13} />
                            Audit-ready records — clean data when you need it
                            most.
                        </div>
                    </div>
                </div>

                {/* Migration promise */}
                <div className="ab-card ab-card--full ab-reveal">
                    <div className="ab-card-tag">Getting started</div>
                    <h2 className="ab-card-title">
                        Free migration — we do the work
                    </h2>
                    <p className="ab-card-text">
                        Switching from Excel feels like a project. So we handle
                        it for you. Send us your existing patient list and
                        service rates in any format — we import everything and
                        have your clinic live, usually within a day. No data
                        entry on your end.
                    </p>
                    <div
                        className="ab-notice ab-notice--amber"
                        style={{ marginTop: 16 }}
                    >
                        <CheckCircle2 size={13} />
                        Free for all new clinics. Contact
                        invohealth.app@gmail.com to get started.
                    </div>
                </div>

                {/* Contact + Developer */}
                <div className="ab-row-2">
                    <div className="ab-card ab-reveal">
                        <div className="ab-card-tag">Support</div>
                        <h2 className="ab-card-title">Contact</h2>
                        <p className="ab-card-text">
                            Questions, feedback, feature requests, or clinic
                            setup:
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
                            Focused on building practical software that
                            simplifies everyday workflows for healthcare
                            professionals — tools that actually get used, not
                            enterprise bloatware.
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
