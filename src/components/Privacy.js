import { LockIcon } from "lucide-react";
import { useEffect, useRef } from "react";

const sections = [
    {
        num: "01",
        title: "Introduction",
        body: "InvoHealth respects your privacy and is committed to protecting your personal and clinic information. This Privacy Policy explains how we collect and use information when you use our platform.",
    },
    {
        num: "02",
        title: "Information We Collect",
        body: "We may collect the following information when you register and use the platform:",
        list: [
            "Name and contact information (securely processed)",
            "Email address",
            "Clinic and professional details",
            "Patient and appointment records entered by users",
            "Encrypted contact numbers for security purposes",
        ],
    },
    {
        num: "03",
        title: "How We Use Information",
        body: "Information collected is used to:",
        list: [
            "Provide clinic management features",
            "Maintain and improve the platform",
            "Communicate service updates",
            "Ensure security and prevent misuse",
        ],
    },
    {
        num: "04",
        title: "Data Ownership",
        body: "Users retain ownership of the data they store on InvoHealth. We do not claim ownership of patient or clinic records entered by users.",
    },
    {
        num: "05",
        title: "Data Security",
        body: "We implement strong security measures to protect user data. Sensitive information such as passwords and phone numbers are securely stored using hashing and encryption techniques. Phone numbers are never stored in plain text and are masked within the platform. Access to sensitive data is restricted and controlled through authentication and role-based permissions. While we take appropriate precautions, no system can guarantee absolute security.",
    },
    {
        num: "06",
        title: "Data Protection Practices",
        body: "InvoHealth follows a privacy-first approach. Sensitive data such as phone numbers are encrypted and masked to prevent unauthorized access. We do not store sensitive information in plain text and continuously improve our security practices.",
    },
    {
        num: "07",
        title: "Third-Party Services",
        body: "Payments and certain services may be processed through third-party providers such as Razorpay. These services operate under their own privacy policies.",
    },
    {
        num: "08",
        title: "Data Loss Disclaimer",
        body: "Although we aim to maintain reliable data storage, InvoHealth does not guarantee permanent availability of stored data. Users are encouraged to keep backups of important information.",
    },
    {
        num: "09",
        title: "Changes to Privacy Policy",
        body: "This Privacy Policy may be updated periodically to reflect changes in our services or legal requirements.",
    },
    {
        num: "10",
        title: "Contact",
        body: "For privacy-related inquiries, please contact:",
        isContact: true,
    },
];

export default function Privacy() {
    const itemsRef = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting)
                        entry.target.classList.add("pp-visible");
                });
            },
            { threshold: 0.08 },
        );
        itemsRef.current.forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <>
            <style>{`
 ${sections.map((_, i) => `.pp-item:nth-child(${i + 1}) { transition-delay: ${0.04 + i * 0.03}s; }`).join("\n")} `}</style>

            <div className="pp-root">
                <div className="pp-inner">
                    <div className="pp-header">
                        <div className="pp-eyebrow">
                            <span className="pp-eyebrow-line" />
                            InvoHealth · Legal
                            <span className="pp-eyebrow-line" />
                        </div>
                        <h1 className="pp-title">
                            Privacy <em>Policy</em>
                        </h1>
                        <div className="pp-date">
                            Last updated · {new Date().getFullYear()}
                        </div>
                    </div>

                    <div className="pp-divider">
                        <div className="pp-divider-line" />
                        <div className="pp-divider-dot" />
                        <div className="pp-divider-line" />
                    </div>

                    <div>
                        {sections.map((s, i) => (
                            <div
                                key={s.num}
                                className="pp-item"
                                ref={(el) => (itemsRef.current[i] = el)}
                            >
                                <div className="pp-num">{s.num}</div>
                                <div>
                                    <div className="pp-section-title">
                                        {s.title}
                                    </div>
                                    {s.body && (
                                        <p className="pp-body">
                                            {s.isContact ? (
                                                <>
                                                    For privacy-related
                                                    inquiries, please contact:{" "}
                                                    <a
                                                        href="mailto:invohealth.app@gmail.com"
                                                        className="pp-contact-link"
                                                    >
                                                        invohealth.app@gmail.com
                                                    </a>
                                                </>
                                            ) : (
                                                s.body
                                            )}
                                        </p>
                                    )}
                                    {s.list && (
                                        <ul className="pp-list">
                                            {s.list.map((item, j) => (
                                                <li key={j}>
                                                    <span className="pp-list-bullet" />
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div
                        className="pp-footer"
                        ref={(el) => (itemsRef.current[sections.length] = el)}
                    >
                        <div className="pp-footer-icon">
                            <LockIcon size={18} />
                        </div>
                        <div className="pp-footer-text">
                            <strong>Your data stays yours.</strong> Sensitive
                            information is encrypted and protected. InvoHealth
                            does not sell or share your personal or clinic data
                            with third parties.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
