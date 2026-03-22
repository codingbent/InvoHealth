import React, { useEffect, useRef } from "react";

const sections = [
    {
        num: "01",
        title: "Acceptance of Terms",
        body: "By accessing or using InvoHealth, you agree to comply with these Terms & Conditions. If you do not agree with any part of these terms, please discontinue use of the platform.",
    },
    {
        num: "02",
        title: "Nature of the Service",
        body: "InvoHealth is a clinic management platform designed to help healthcare professionals manage patients, appointments, billing, and clinic operations. The platform does not provide medical advice, diagnosis, or treatment.",
    },
    {
        num: "03",
        title: "Early Stage / Beta Software",
        body: "InvoHealth is currently an early-stage product and may contain bugs or incomplete features. Some features may change, improve, or be removed over time as the platform evolves.",
    },
    {
        num: "04",
        title: "Data Storage Disclaimer",
        body: "While we strive to maintain reliable storage of user data, InvoHealth does not guarantee permanent storage or availability of information. Users are responsible for maintaining backups of important clinic or patient records.",
    },
    {
        num: "05",
        title: "User Responsibilities",
        body: "Users agree to provide accurate information, maintain confidentiality of login credentials, and use the platform in accordance with applicable laws and medical regulations.",
    },
    {
        num: "06",
        title: "Subscription & Payments",
        body: "Some features may require a paid subscription. Payments are processed securely through third-party payment providers such as Razorpay.",
    },
    {
        num: "07",
        title: "Limitation of Liability",
        body: "InvoHealth shall not be liable for any data loss, financial loss, business interruption, or medical decisions made using information stored on the platform.",
    },
    {
        num: "08",
        title: "Service Availability",
        body: "We aim to maintain high uptime but cannot guarantee uninterrupted service. Maintenance, updates, or technical issues may occasionally cause downtime.",
    },
    {
        num: "09",
        title: "Changes to Terms",
        body: "These terms may be updated periodically to reflect improvements or changes in the platform.",
    },
    {
        num: "10",
        title: "Contact",
        body: "For any questions regarding these Terms & Conditions, please contact: invohealth.app@gmail.com",
        isContact: true,
    },
];

export default function Terms() {
    const itemsRef = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("tc-visible");
                    }
                });
            },
            { threshold: 0.1 },
        );
        itemsRef.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <div className="tc-root">
                <div className="tc-inner">
                    {/* Header */}
                    <div className="tc-header">
                        <div className="tc-eyebrow">
                            <span className="tc-eyebrow-line" />
                            InvoHealth · Legal
                            <span className="tc-eyebrow-line" />
                        </div>
                        <h1 className="tc-title">
                            Terms &amp; <em>Conditions</em>
                        </h1>
                        <div className="tc-date">
                            Last updated · {new Date().getFullYear()}
                        </div>
                    </div>

                    <div className="tc-divider">
                        <div className="tc-divider-line" />
                        <div className="tc-divider-dot" />
                        <div className="tc-divider-line" />
                    </div>

                    {/* Sections */}
                    <div>
                        {sections.map((s, i) => (
                            <div
                                key={s.num}
                                className="tc-item"
                                ref={(el) => (itemsRef.current[i] = el)}
                            >
                                <div className="tc-num">{s.num}</div>
                                <div className="tc-content">
                                    <div className="tc-section-title">
                                        {s.title}
                                    </div>
                                    <p className="tc-body">
                                        {s.isContact ? (
                                            <>
                                                For any questions regarding
                                                these Terms &amp; Conditions,
                                                please contact:{" "}
                                                <a
                                                    href="mailto:invohealth.app@gmail.com"
                                                    className="tc-contact-link"
                                                >
                                                    invohealth.app@gmail.com
                                                </a>
                                            </>
                                        ) : (
                                            s.body
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer note */}
                    <div
                        className="tc-footer"
                        ref={(el) => (itemsRef.current[sections.length] = el)}
                    >
                        <div className="tc-footer-icon">⚖</div>
                        <div className="tc-footer-text">
                            <strong>These terms are subject to change.</strong>{" "}
                            Continued use of InvoHealth after updates
                            constitutes acceptance of the revised terms. We
                            recommend checking this page periodically.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
