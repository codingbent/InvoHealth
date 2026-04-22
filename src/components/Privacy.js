import { useEffect, useRef } from "react";
import { LockIcon, Shield } from "lucide-react";
import "../css/LegalPages.css";

const sections = [
    {
        num: "01",
        title: "Introduction",
        body: "InvoHealth respects your privacy and is committed to protecting your personal and Medical Center information. This Privacy Policy explains how we collect, use, and protect information when you use our platform.",
    },
    {
        num: "02",
        title: "Information We Collect",
        body: "We may collect the following information when you register and use the platform:",
        list: [
            "Name and contact information (securely processed)",
            "Email address (used for communication via Gmail API)",
            "Medical Center and professional details",
            "Patient and appointment records entered by users",
            "Encrypted contact numbers for security purposes",
            "Payment information processed via Razorpay (India) or international payment providers",
        ],
    },
    {
        num: "03",
        title: "How We Use Information",
        body: "Information collected is used to:",
        list: [
            "Provide Medical Center management features",
            "Send invoices, appointment reminders, and notifications via Gmail API",
            "Process payments through Razorpay (India) or international payment gateways",
            "Maintain and improve the platform",
            "Communicate service updates",
            "Ensure security and prevent misuse",
        ],
    },
    {
        num: "04",
        title: "Data Ownership",
        body: "Users retain ownership of the data they store on InvoHealth. We do not claim ownership of patient records entered by users.",
    },
    {
        num: "05",
        title: "Data Security",
        body: "We implement strong security measures. Sensitive data such as passwords and phone numbers are protected using AES encryption where applicable. Some data may be stored in secure formats for operational purposes.",
    },
    {
        num: "06",
        title: "Email Communications via Gmail API",
        body: "InvoHealth uses the Gmail API to send transactional emails such as invoices, appointment confirmations, and Medical Center notifications on behalf of users. We access only the permissions necessary to send emails and do not read, store, or share the contents of your Gmail inbox. Your Gmail credentials are never stored in plain text.",
    },
    {
        num: "07",
        title: "Payment Processing",
        body: "InvoHealth supports payments through multiple providers depending on your region:",
        list: [
            "Razorpay — used for Indian users (INR transactions, UPI, cards, net banking)",
            "International payment gateways — used for users outside India; phone numbers may be required for identity verification or billing by these providers",
            "We do not store card or banking details on our servers; all payment data is handled directly by the respective payment provider",
            "Each provider operates under their own privacy policy and security standards",
        ],
    },
    {
        num: "08",
        title: "Data Protection Practices",
        body: "InvoHealth follows a privacy-first approach. Sensitive data such as phone numbers are encrypted and masked to prevent unauthorized access. We do not store sensitive information in plain text and continuously improve our security practices.",
    },
    {
        num: "09",
        title: "Data Loss Disclaimer",
        body: "Although we aim to maintain reliable data storage, InvoHealth does not guarantee permanent availability of stored data. Users are encouraged to keep backups of important information.",
    },
    {
        num: "10",
        title: "Image Upload Disclaimer",
        body: "Images uploaded to the platform (such as prescriptions or medical reports) are stored as file resources and are not encrypted or hashed. Users should avoid uploading highly sensitive or confidential images. InvoHealth is not responsible for unauthorized access caused by external breaches or misuse.",
    },
    {
        num: "11",
        title: "Changes to Privacy Policy",
        body: "This Privacy Policy may be updated periodically to reflect changes in our services or legal requirements. Continued use of the platform after updates constitutes acceptance of the revised policy.",
    },
    {
        num: "12",
        title: "Cookies & Local Storage",
        body: "We use browser storage (localStorage and cookies) to manage authentication tokens and improve user experience. No third-party tracking cookies are used.",
    },
    {
        num: "13",
        title: "User Rights",
        body: "You have the following rights regarding your data:",
        list: [
            "Right to access your data",
            "Right to correct your data",
            "Right to delete your data",
            "Right to data portability",
            "Right to object to processing",
        ],
    },
    {
        num: "14",
        title: "Data Retention",
        body: "We retain data as long as necessary to provide services and comply with legal obligations. Users may request deletion at any time.",
    },
    {
        num: "15",
        title: "Legal Basis for Processing",
        body: "We process data based on contractual necessity, legitimate interests, and user consent.",
    },
    {
        num: "16",
        title: "Third-Party Services",
        body: "InvoHealth integrates with the following third-party services:",
        list: [
            "Razorpay — payment processing (India)",
            "PayPal — international payments",
            "Gmail API — email delivery",
            "n8n — workflow automation",
        ],
    },
    {
        num: "17",
        title: "Data Breach Notification",
        body: "In case of a data breach, affected users will be notified as required by applicable laws.",
    },
    {
        num: "18",
        title: "Contact",
        body: "",
        isContact: true,
    },
];

export default function Privacy() {
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
        <div className="lgl-root lgl-root--privacy">
            {/* Bg */}
            <div className="lgl-grid" aria-hidden />
            <div
                className="lgl-orb lgl-orb-1"
                style={{ background: "rgba(96,165,250,0.04)" }}
                aria-hidden
            />
            <div
                className="lgl-orb lgl-orb-2"
                style={{ background: "rgba(77,124,246,0.04)" }}
                aria-hidden
            />

            <div className="lgl-inner">
                {/* Header */}
                <header
                    className="lgl-header lgl-anim"
                    ref={(el) => (itemsRef.current[-2] = el)}
                >
                    <div
                        className="lgl-header-icon"
                        style={{
                            background: "rgba(96,165,250,0.08)",
                            borderColor: "rgba(96,165,250,0.2)",
                            color: "#93c5fd",
                        }}
                    >
                        <LockIcon size={20} />
                    </div>
                    <div className="lgl-eyebrow">InvoHealth · Legal</div>
                    <h1 className="lgl-title lgl-title--privacy">
                        Privacy <em>Policy</em>
                    </h1>
                    <p className="lgl-header-sub">
                        We are committed to protecting your privacy. This policy
                        explains how we collect, use, and protect your
                        information.
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
                                        For privacy-related inquiries, please
                                        contact:{" "}
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

                {/* Footer */}
                <div
                    className="lgl-footer-note lgl-anim"
                    ref={(el) => (itemsRef.current[sections.length] = el)}
                >
                    <div
                        className="lgl-footer-note-icon"
                        style={{
                            background: "rgba(96,165,250,0.08)",
                            borderColor: "rgba(96,165,250,0.18)",
                            color: "#93c5fd",
                        }}
                    >
                        <LockIcon size={15} />
                    </div>
                    <p className="lgl-footer-note-text">
                        <strong>Your data stays yours.</strong> Sensitive
                        information is encrypted and protected. InvoHealth does
                        not sell or share your personal or Medical Center data with
                        third parties.
                    </p>
                </div>
            </div>
        </div>
    );
}
