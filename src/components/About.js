import {
    Zap,
    Building2,
    Smartphone,
    ShieldCheck,
    Mail,
    Info,
    Copyright,
} from "lucide-react";

export default function About() {
    const features = [
        "Patient profile management",
        "Appointment scheduling with time slots",
        "Appointment & visit history",
        "Upload prescriptions, X-rays & reports",
        "Service-based billing system",
        "Discounts (flat & percentage)",
        "Partial & full payment support",
        "Auto payment status tracking",
        "Revenue insights & analytics",
        "Multiple payment modes",
        "Advanced filters",
        "Day-wise & month-wise income",
        "PDF invoice generation",
        "Excel export",
        "Fully responsive design",
        "Hassle-free audit records",
    ];

    const highlights = [
        { icon: <Zap size={14} />, label: "Fast & minimal" },
        { icon: <Building2 size={14} />, label: "Clinic-first design" },
        { icon: <Smartphone size={14} />, label: "Mobile & desktop" },
        { icon: <ShieldCheck size={14} />, label: "Secure access" },
        { icon: <ShieldCheck size={14} />, label: "Encrypted data" },
    ];

    return (
        <>
            <div className="ab-root">
                {/* Hero */}
                <div className="ab-hero">
                    <div className="ab-logo-badge">
                        <span className="ab-logo-dot" />
                        Clinic Management System
                    </div>
                    <h1 className="ab-hero-title">
                        Invo<span>Health</span>
                    </h1>
                    <p className="ab-hero-sub">
                        A modern clinic management system to manage patients,
                        appointments with time slots, billing, and medical
                        records including prescriptions and reports.
                    </p>
                </div>

                {/* Highlights */}
                <div className="ab-highlights">
                    {highlights.map((h) => (
                        <div key={h.label} className="ab-highlight-pill">
                            <span>{h.icon}</span>
                            <span>{h.label}</span>
                        </div>
                    ))}
                </div>

                {/* Cards grid */}
                <div className="ab-grid">
                    {/* What is */}
                    <div className="ab-card">
                        <div className="ab-card-eyebrow">Overview</div>
                        <div className="ab-card-title">What is InvoHealth?</div>
                        <p className="ab-card-body">
                            InvoHealth is a modern clinic management and billing
                            platform designed to streamline daily healthcare
                            operations. It enables doctors to efficiently manage
                            patient records, schedule appointments with time
                            slots, upload prescriptions and medical reports, and
                            handle billing — all in one centralized system.
                        </p>
                    </div>

                    {/* Purpose */}
                    <div className="ab-card">
                        <div className="ab-card-eyebrow">Purpose</div>
                        <div className="ab-card-title">
                            Built for Real Clinics
                        </div>
                        <p className="ab-card-body">
                            Designed specifically for private clinics,
                            InvoHealth helps reduce manual paperwork and
                            streamline day-to-day operations. From patient
                            records and medical report uploads to billing and
                            appointment scheduling, it brings efficiency and
                            structure to real-world clinical workflows.
                        </p>
                        <div className="ab-alert warning">
                            <span className="ab-alert-icon">⚡</span>
                            Actively evolving based on real clinic needs.
                        </div>
                    </div>

                    {/* Features — full width */}
                    <div className="ab-card ab-full">
                        <div className="ab-card-eyebrow">Capabilities</div>
                        <div className="ab-card-title">Key Features</div>
                        <div className="ab-features-grid">
                            {features.map((f) => (
                                <div key={f} className="ab-feature-item">
                                    <span className="ab-check">✓</span>
                                    {f}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Accounting */}
                    <div className="ab-card">
                        <div className="ab-card-eyebrow">Finance</div>
                        <div className="ab-card-title">
                            Accounting & ITR Support
                        </div>
                        <p className="ab-card-body">
                            Clean financial records for CA review and tax
                            filing.
                        </p>
                        <ul className="ab-list">
                            <li>Monthly & yearly tracking</li>
                            <li>Payment-mode summaries</li>
                            <li>Excel export for CA</li>
                        </ul>
                        <div className="ab-alert info">
                            <span className="ab-alert-icon">
                                <Info size={18} />
                            </span>
                            <span>
                                <strong>Note:</strong> Consult a CA for final
                                filings.
                            </span>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="ab-card">
                        <div className="ab-card-eyebrow">Security</div>
                        <div className="ab-card-title">Access Control</div>
                        <p className="ab-card-body">
                            Advanced security with encrypted sensitive data,
                            token-based authentication, and role-based access
                            control. Phone numbers and critical data are
                            securely stored using hashing and encryption to
                            prevent unauthorized access.
                        </p>
                        <ul className="ab-list" style={{ marginTop: 12 }}>
                            <li>Token-based auth</li>
                            <li>Role-based permissions</li>
                            <li>Protected sensitive records</li>
                        </ul>
                    </div>

                    {/* Contact + Dev — side by side */}
                    <div className="ab-card">
                        <div className="ab-card-eyebrow">Support</div>
                        <div className="ab-card-title">Contact</div>
                        <p className="ab-card-body">
                            Feedback & support enquiries:
                        </p>
                        <a
                            href="mailto:invohealth.app@gmail.com"
                            className="ab-contact-link"
                        >
                            <Mail size={18} /> invohealth.app@gmail.com
                        </a>
                    </div>

                    <div className="ab-card">
                        <div className="ab-card-eyebrow">Developer</div>
                        <div className="ab-card-title">Built by</div>
                        <p
                            className="ab-card-body"
                            style={{ marginBottom: 10 }}
                        >
                            <span className="ab-dev-name">Abhed Agarwal</span>
                        </p>
                        <p className="ab-card-body">
                            Focused on building practical, real-world software
                            solutions that simplify everyday workflows for
                            professionals.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="ab-footer">
                    <span className="ab-footer-left">
                        <Copyright size={18} /> {new Date().getFullYear()}{" "}
                        InvoHealth. All rights reserved.
                    </span>
                    <span className="ab-version-badge">
                        v{process.env.REACT_APP_VERSION}
                    </span>
                </div>
            </div>
        </>
    );
}
