import "../../css/About.css";
import {
    CalendarDays,
    Stethoscope,
    CreditCard,
    Folder,
    FileText,
    Mail,
} from "lucide-react";

const PatientAbout = () => {
    return (
        <div className="ab-root">
            <div className="ab-grid-bg" />
            <div className="ab-glow ab-glow-1" />
            <div className="ab-glow ab-glow-2" />

            {/* HERO */}
            <section className="ab-hero">
                <div className="ab-badge">
                    <span className="ab-badge-dot" />
                    Patient Portal
                </div>

                <h1 className="ab-hero-title">
                    About <span>InvoHealth</span>
                </h1>

                <p className="ab-hero-sub">
                    Keep all your medical records, appointments, and invoices in
                    one place — so you always know your health history without
                    relying on papers or memory.
                </p>
            </section>

            {/* BODY */}
            <div className="ab-body">
                {/* OVERVIEW */}
                <div className="ab-card ab-card--full">
                    <div className="ab-card-tag">Overview</div>
                    <h2 className="ab-card-title">What is InvoHealth?</h2>
                    <p className="ab-card-text">
                        InvoHealth is a simple patient portal that helps you
                        keep track of your healthcare in one place. Every visit,
                        invoice, and record is saved automatically so you can
                        access it anytime without searching through files or
                        messages.
                    </p>

                    <p className="ab-card-text" style={{ marginTop: 12 }}>
                        Whether you visit one doctor or multiple clinics,
                        everything stays organized and easy to access whenever
                        you need it.
                    </p>
                </div>

                <div className="ab-card ab-card--full">
                    <div className="ab-card-tag">Access Anywhere</div>

                    <h2 className="ab-card-title">
                        Your records stay with you
                    </h2>

                    <p className="ab-card-text">
                        Access your appointments, invoices, reports, and medical
                        history anytime from your phone, tablet, or desktop.
                    </p>
                </div>

                {/* FEATURES */}
                <div className="ab-card ab-card--full">
                    <div className="ab-card-tag">Features</div>
                    <h2 className="ab-card-title">What you can do</h2>

                    <div className="ab-features">
                        <div className="ab-feature">
                            <span className="ab-feature-icon">
                                <CalendarDays size={14} />
                            </span>
                            <span>
                                See all your appointments — past and upcoming
                            </span>
                        </div>

                        <div className="ab-feature">
                            <span className="ab-feature-icon">
                                <Stethoscope size={14} />
                            </span>
                            <span>
                                Stay connected with your doctors and clinics
                            </span>
                        </div>

                        <div className="ab-feature">
                            <span className="ab-feature-icon">
                                <CreditCard size={14} />
                            </span>
                            <span>Track payments, bills, and pending dues</span>
                        </div>

                        <div className="ab-feature">
                            <span className="ab-feature-icon">
                                <Folder size={14} />
                            </span>
                            <span>
                                View your complete visit history anytime
                            </span>
                        </div>

                        <div className="ab-feature">
                            <span className="ab-feature-icon">
                                <FileText size={14} />
                            </span>
                            <span>
                                Download invoices, prescriptions, reports, and
                                PDFs instantly
                            </span>
                        </div>
                        <div className="ab-feature">
                            <span className="ab-feature-icon">
                                <Mail size={14} />
                            </span>
                            <span>
                                Receive records and appointment updates directly
                                by email
                            </span>
                        </div>
                    </div>
                </div>

                {/* SECURITY + TRUST */}
                <div className="ab-row-2">
                    <div className="ab-card">
                        <div className="ab-card-tag">Security</div>
                        <h2 className="ab-card-title">
                            Your data stays private
                        </h2>
                        <p className="ab-card-text">
                            Your information is securely stored and accessible
                            only to you and authorized clinic staff involved in
                            your care. Your records are never sold or shared
                            with advertisers.
                        </p>

                        <ul className="ab-list">
                            <li>Secure login with OTP verification</li>
                            <li>Protected storage of your data</li>
                            <li>No sharing with third parties</li>
                        </ul>
                    </div>

                    <div className="ab-card">
                        <div className="ab-card-tag">Why it matters</div>
                        <h2 className="ab-card-title">No more lost records</h2>
                        <p className="ab-card-text">
                            No more misplaced prescriptions or forgotten
                            details. Everything is saved automatically after
                            each visit, so you always have a clear record of
                            your health.
                        </p>
                    </div>
                </div>

                {/* MULTI PROFILE */}
                <div className="ab-card ab-card--full">
                    <div className="ab-card-tag">Family Support</div>
                    <h2 className="ab-card-title">
                        Manage multiple patient profiles
                    </h2>
                    <p className="ab-card-text">
                        Manage healthcare records for family members, children,
                        or dependents from a single account without switching
                        logins.
                    </p>
                </div>

                {/* SUPPORT */}
                <div className="ab-card ab-card--full">
                    <div className="ab-card-tag">Support</div>
                    <h2 className="ab-card-title">Need help?</h2>
                    <p className="ab-card-text">
                        If you face any issues, you can contact your clinic or
                        reach out to our support team anytime.
                    </p>

                    <a
                        href="mailto:invohealth.app@gmail.com"
                        className="ab-contact"
                    >
                        <Mail size={15} />
                        invohealth.app@gmail.com
                    </a>
                </div>
            </div>
            <footer className="ab-footer">
                <span className="ab-footer-copy">
                    © {new Date().getFullYear()} InvoHealth
                </span>

                <span className="ab-version">
                    v{process.env.REACT_APP_VERSION}
                </span>
            </footer>
        </div>
    );
};

export default PatientAbout;
