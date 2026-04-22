import { useEffect, useRef } from "react";
import { Info, FileText, Shield } from "lucide-react";
import "../css/LegalPages.css";

const sections = [
    {
        num: "01",
        title: "Acceptance of Terms",
        body: "By accessing or using InvoHealth, you agree to comply with these Terms & Conditions. If you do not agree with any part of these terms, please discontinue use of the platform.",
    },
    {
        num: "02",
        title: "Nature of the Service",
        body: "InvoHealth is a Medical Center management platform designed to help healthcare professionals manage patients, appointments, billing, and Medical Center operations. The platform does not provide medical advice, diagnosis, or treatment.",
    },
    {
        num: "03",
        title: "Platform Updates",
        body: "InvoHealth may update or modify features over time. Significant changes affecting paid features will be communicated in advance.",
    },
    {
        num: "04",
        title: "Email Communications via Gmail API",
        body: "InvoHealth uses the Gmail API to send transactional emails including invoices, appointment reminders, and Medical Center notifications on your behalf. By connecting your Google account, you grant InvoHealth permission to send emails through your Gmail account solely for these purposes. We do not read, index, store, or share the contents of your inbox. You may revoke this access at any time through your Google account settings.",
    },
    {
        num: "05",
        title: "Subscription & Payments",
        body: "Some features require a paid subscription. Payments are processed securely through third-party providers depending on your region:",
        list: [
            "Razorpay — for Indian users (INR, UPI, cards, net banking)",
            "PayPal — for international users; a phone number may be required by the provider for verification or billing purposes",
            "InvoHealth does not store card numbers, bank account details, or other sensitive payment credentials on its servers",
            "All payment transactions are governed by the terms and privacy policies of the respective payment provider",
        ],
    },
    {
        num: "06",
        title: "Data Storage",
        body: "We aim to store data reliably, but users should maintain backups. Data is retained for at least 12 months unless deleted by the user.",
    },
    {
        num: "07",
        title: "User Responsibilities",
        body: "Users are responsible for the accuracy of data entered into the platform. While certain sensitive data such as passwords and contact numbers are encrypted, uploaded images (including prescriptions, reports, or documents) are stored as file resources and may not be encrypted. Users should avoid uploading highly confidential or sensitive information.",
    },
    {
        num: "08",
        title: "Image Upload & Data Exposure",
        body: "Images uploaded to InvoHealth (such as prescriptions, reports, or medical documents) are stored as file resources and are not encrypted or hashed. While access controls are implemented, InvoHealth does not guarantee absolute protection against unauthorized access. Users are advised not to upload highly sensitive or confidential images.",
    },
    {
        num: "09",
        title: "Limitation of Liability",
        body: "InvoHealth shall not be liable for any data loss, unauthorized access, financial loss, business interruption, or medical decisions made using the platform. This includes any exposure of uploaded images or documents, payment disputes handled by third-party providers, or email delivery failures via the Gmail API.",
    },
    {
        num: "10",
        title: "Service Availability",
        body: "We aim to maintain high uptime but cannot guarantee uninterrupted service. Maintenance, updates, or technical issues may occasionally cause downtime.",
    },
    {
        num: "11",
        title: "Changes to Terms",
        body: "These terms may be updated periodically to reflect improvements or changes in the platform. Continued use of InvoHealth after updates constitutes acceptance of the revised terms. We recommend checking this page periodically.",
    },
    {
        num: "12",
        title: "Refund, Cancellation & Billing Policy",
        body: "Subscriptions are billed in advance and are non-refundable unless required by law.",
        list: [
            "Users can cancel anytime",
            "Access continues until the billing cycle ends",
            "No prorated refunds",
            "Chargebacks may result in account suspension",
        ],
    },
    {
        num: "13",
        title: "Governing Law & Jurisdiction",
        body: "These Terms are governed by the laws of India. Any disputes shall be subject to courts in Uttar Pradesh, India.",
    },
    {
        num: "14",
        title: "Account Suspension & Termination",
        body: "Accounts may be suspended or terminated for violations, fraud, or non-payment. Users should export their data before termination.",
    },
    {
        num: "15",
        title: "Intellectual Property",
        body: "All platform rights belong to InvoHealth. Users retain ownership of their data.",
    },
    {
        num: "16",
        title: "Contact",
        body: "",
        isContact: true,
    },
];

export default function Terms() {
    const itemsRef = useRef([]);

    useEffect(() => {
        const obs = new IntersectionObserver(
            (entries) =>
                entries.forEach((e) => {
                    if (e.isIntersecting) e.target.classList.add("lgl-in");
                }),
            { threshold: 0.07, rootMargin: "0px 0px -30px 0px" },
        );
        itemsRef.current.forEach((el) => el && obs.observe(el));
        return () => obs.disconnect();
    }, []);

    return (
        <div className="lgl-root">

            {/* Bg elements */}
            <div className="lgl-grid" aria-hidden />
            <div className="lgl-orb lgl-orb-1" aria-hidden />
            <div className="lgl-orb lgl-orb-2" aria-hidden />

            <div className="lgl-inner">
                {/* Header */}
                <header
                    className="lgl-header lgl-anim"
                    ref={(el) => (itemsRef.current[-2] = el)}
                >
                    <div className="lgl-header-icon">
                        <FileText size={20} />
                    </div>
                    <div className="lgl-eyebrow">InvoHealth · Legal</div>
                    <h1 className="lgl-title">
                        Terms &amp; <em>Conditions</em>
                    </h1>
                    <p className="lgl-header-sub">
                        Read these terms carefully before using the platform. By
                        using InvoHealth, you accept these terms in full.
                    </p>
                    <div className="lgl-date">
                        <span className="lgl-date-dot" />
                        Last updated · {new Date().getFullYear()}
                    </div>
                </header>

                {/* Divider */}
                <div
                    className="lgl-rule lgl-anim"
                    ref={(el) => (itemsRef.current[-1] = el)}
                >
                    <div className="lgl-rule-line" />
                    <span className="lgl-rule-label">
                        <Shield size={10} /> {sections.length} sections
                    </span>
                    <div className="lgl-rule-line" />
                </div>

                {/* Sections */}
                <div className="lgl-sections">
                    {sections.map((s, i) => (
                        <div
                            key={s.num}
                            className="lgl-item lgl-anim"
                            ref={(el) => (itemsRef.current[i] = el)}
                            style={{
                                transitionDelay: `${Math.min(i * 0.025, 0.2)}s`,
                            }}
                        >
                            <div className="lgl-num">{s.num}</div>
                            <div className="lgl-content">
                                <h3 className="lgl-section-title">{s.title}</h3>
                                {s.isContact ? (
                                    <p className="lgl-body">
                                        For any questions regarding these Terms
                                        &amp; Conditions, please contact:{" "}
                                        <a
                                            href="mailto:invohealth.app@gmail.com"
                                            className="lgl-link"
                                        >
                                            invohealth.app@gmail.com
                                        </a>
                                    </p>
                                ) : (
                                    <>
                                        {s.body && (
                                            <p className="lgl-body">{s.body}</p>
                                        )}
                                        {s.list && (
                                            <ul className="lgl-list">
                                                {s.list.map((item, j) => (
                                                    <li key={j}>
                                                        <span className="lgl-bullet" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer note */}
                <div
                    className="lgl-footer-note lgl-anim"
                    ref={(el) => (itemsRef.current[sections.length] = el)}
                >
                    <div className="lgl-footer-note-icon">
                        <Info size={15} />
                    </div>
                    <p className="lgl-footer-note-text">
                        <strong>These terms are subject to change.</strong>{" "}
                        Continued use of InvoHealth after updates constitutes
                        acceptance of the revised terms. We recommend checking
                        this page periodically.
                    </p>
                </div>
            </div>
        </div>
    );
}

// const LEGAL_CSS = `
// /* ── Shared legal page styles (Terms + Privacy share these) ── */
// .lgl-root {
//     min-height: 100vh;
//     background: #070b14;
//     color: #c5d0e8;
//     padding: 0 0 100px;
//     position: relative;
//     overflow-x: hidden;
//     font-family: 'DM Sans', system-ui, sans-serif;
// }

// .lgl-grid {
//     position: fixed;
//     inset: 0;
//     background-image:
//         linear-gradient(rgba(77,124,246,0.025) 1px, transparent 1px),
//         linear-gradient(90deg, rgba(77,124,246,0.025) 1px, transparent 1px);
//     background-size: 52px 52px;
//     pointer-events: none;
//     z-index: 0;
// }

// .lgl-orb {
//     position: fixed;
//     border-radius: 50%;
//     filter: blur(90px);
//     pointer-events: none;
//     z-index: 0;
// }
// .lgl-orb-1 {
//     width: 450px; height: 450px;
//     top: -100px; right: -100px;
//     background: rgba(77,124,246,0.05);
// }
// .lgl-orb-2 {
//     width: 350px; height: 350px;
//     bottom: 0; left: -80px;
//     background: rgba(96,165,250,0.04);
// }

// .lgl-inner {
//     position: relative;
//     z-index: 1;
//     max-width: 800px;
//     margin: 0 auto;
//     padding: 0 20px;
// }

// /* ── Scroll reveal ── */
// .lgl-anim {
//     opacity: 0;
//     transform: translateY(20px);
//     transition: opacity 0.5s ease, transform 0.5s ease;
// }
// .lgl-in {
//     opacity: 1;
//     transform: translateY(0);
// }

// /* ── Header ── */
// .lgl-header {
//     text-align: center;
//     padding: 80px 0 56px;
// }

// .lgl-header-icon {
//     width: 52px; height: 52px;
//     border-radius: 14px;
//     background: rgba(77,124,246,0.1);
//     border: 1px solid rgba(77,124,246,0.2);
//     color: #60a5fa;
//     display: flex; align-items: center; justify-content: center;
//     margin: 0 auto 20px;
// }

// .lgl-eyebrow {
//     font-size: 10px;
//     letter-spacing: 0.22em;
//     text-transform: uppercase;
//     color: #334155;
//     margin-bottom: 14px;
//     font-family: 'DM Mono', monospace;
// }

// .lgl-title {
//     font-size: clamp(32px, 5.5vw, 52px);
//     font-weight: 700;
//     color: #e2e8f0;
//     line-height: 1.1;
//     margin-bottom: 16px;
//     letter-spacing: -0.02em;
// }
// .lgl-title em {
//     font-style: normal;
//     color: #4d7cf6;
// }

// .lgl-header-sub {
//     font-size: 14px;
//     color: #4a5a7a;
//     line-height: 1.65;
//     max-width: 480px;
//     margin: 0 auto 20px;
// }

// .lgl-date {
//     display: inline-flex;
//     align-items: center;
//     gap: 8px;
//     font-size: 11px;
//     color: #2e3d5c;
//     font-family: 'DM Mono', monospace;
//     letter-spacing: 0.08em;
// }
// .lgl-date-dot {
//     width: 5px; height: 5px;
//     border-radius: 50%;
//     background: #2e3d5c;
// }

// /* ── Rule ── */
// .lgl-rule {
//     display: flex;
//     align-items: center;
//     gap: 16px;
//     margin-bottom: 8px;
// }
// .lgl-rule-line {
//     flex: 1;
//     height: 1px;
//     background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
// }
// .lgl-rule-label {
//     display: flex;
//     align-items: center;
//     gap: 5px;
//     font-size: 10px;
//     letter-spacing: 0.12em;
//     text-transform: uppercase;
//     color: #334155;
//     white-space: nowrap;
//     font-family: 'DM Mono', monospace;
// }

// /* ── Section items ── */
// .lgl-sections { display: flex; flex-direction: column; gap: 2px; }

// .lgl-item {
//     display: grid;
//     grid-template-columns: 52px 1fr;
//     gap: 0 20px;
//     padding: 26px 24px;
//     border-radius: 12px;
//     border: 1px solid transparent;
//     transition: border-color 0.22s, background 0.22s;
//     cursor: default;
// }
// .lgl-item:hover {
//     background: rgba(77,124,246,0.035);
//     border-color: rgba(77,124,246,0.12);
// }

// .lgl-num {
//     font-size: 11px;
//     font-weight: 600;
//     color: #2e4a7a;
//     font-family: 'DM Mono', monospace;
//     letter-spacing: 0.06em;
//     padding-top: 3px;
//     user-select: none;
// }

// .lgl-content { display: flex; flex-direction: column; gap: 8px; }

// .lgl-section-title {
//     font-size: 16px;
//     font-weight: 600;
//     color: #c8d5ea;
//     line-height: 1.25;
//     letter-spacing: -0.01em;
// }

// .lgl-body {
//     font-size: 13px;
//     color: #6b7fa8;
//     line-height: 1.8;
//     margin: 0;
// }

// .lgl-list {
//     list-style: none;
//     padding: 0; margin: 4px 0 0;
//     display: flex; flex-direction: column; gap: 7px;
// }
// .lgl-list li {
//     display: flex;
//     align-items: flex-start;
//     gap: 10px;
//     font-size: 13px;
//     color: #56688a;
//     line-height: 1.6;
// }
// .lgl-bullet {
//     width: 4px; height: 4px;
//     border-radius: 50%;
//     background: #2e4a7a;
//     flex-shrink: 0;
//     margin-top: 7px;
// }

// .lgl-link {
//     color: #4d7cf6;
//     text-decoration: none;
//     border-bottom: 1px solid rgba(77,124,246,0.3);
//     transition: color 0.18s, border-color 0.18s;
// }
// .lgl-link:hover {
//     color: #93c5fd;
//     border-color: #93c5fd;
// }

// /* ── Footer note ── */
// .lgl-footer-note {
//     display: flex;
//     align-items: flex-start;
//     gap: 14px;
//     margin-top: 48px;
//     padding: 20px 24px;
//     border-radius: 12px;
//     background: rgba(13,17,23,0.8);
//     border: 1px solid rgba(255,255,255,0.06);
// }
// .lgl-footer-note-icon {
//     width: 34px; height: 34px;
//     border-radius: 9px;
//     background: rgba(77,124,246,0.1);
//     border: 1px solid rgba(77,124,246,0.18);
//     color: #60a5fa;
//     display: flex; align-items: center; justify-content: center;
//     flex-shrink: 0;
//     margin-top: 2px;
// }
// .lgl-footer-note-text {
//     font-size: 12px;
//     color: #3a4a6b;
//     line-height: 1.7;
//     margin: 0;
// }
// .lgl-footer-note-text strong {
//     color: #4a5e7a;
//     font-weight: 600;
// }

// /* ── Responsive ── */
// @media (max-width: 600px) {
//     .lgl-item {
//         grid-template-columns: 1fr;
//         gap: 6px;
//         padding: 20px 16px;
//     }
//     .lgl-header { padding: 60px 0 40px; }
//     .lgl-title { font-size: 30px; }
// }
// `;
