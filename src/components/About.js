export default function About() {
    return (
        <div className="container py-4 py-lg-5">
            <div className="card about-card shadow-lg rounded-4 overflow-hidden">
                {/* HEADER */}
                <div className="about-header text-center px-4 pt-5">
                    <h2 className="fw-bold mb-2">InvoHealth</h2>
                    <p className="mb-0 opacity-75">
                        Lightweight clinic management & invoicing system
                    </p>
                </div>

                <div className="card-body p-4 p-lg-3">
                    {/* INTRO */}
                    <p className="lead text-center text-theme-secondary mb-4">
                        A simple, fast, and practical record-keeping solution
                        built specifically for small personal clinics.
                    </p>

                    {/* WHAT IS */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">
                            📌 What is InvoHealth?
                        </h5>
                        <p className="text-theme-secondary">
                            InvoHealth is a personal clinic management and
                            billing application designed to simplify everyday
                            clinic operations. It helps doctors maintain
                            structured records without complex hospital-grade
                            systems.
                        </p>
                    </section>

                    {/* FEATURES */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-3">🚀 Key Features</h5>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <ul className="list-group list-group-flush theme-list">
                                    <li className="list-group-item">
                                        ✔ Patient profile management
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Appointment & visit history
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Service-based billing system
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Discounts (flat & percentage)
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Partial & full payment support
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Auto payment status (Paid / Partial /
                                        Unpaid)
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Revenue insights for better decision
                                        making
                                    </li>
                                </ul>
                            </div>

                            <div className="col-md-6">
                                <ul className="list-group list-group-flush theme-list">
                                    <li className="list-group-item">
                                        ✔ Multiple payment modes
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Advanced filters
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Day-wise & month-wise income view
                                    </li>
                                    <li className="list-group-item">
                                        ✔ PDF invoice generation
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Excel export
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Fully responsive
                                    </li>

                                    <li className="list-group-item">
                                        ✔ Organized records for hassle-free
                                        audits
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* PURPOSE */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">🎯 Purpose</h5>
                        <p className="text-theme-secondary">
                            This software was built for a single private clinic
                            to reduce manual paperwork and simplify accounting.
                        </p>

                        <div className="alert theme-alert-warning rounded-3 mt-3">
                            Designed for real-world clinic use. Continuously
                            improving with new features.
                        </div>
                    </section>

                    {/* ACCOUNTING */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">
                            🧾 Accounting & ITR Support
                        </h5>
                        <p className="text-theme-secondary">
                            Clean financial records for CA review and tax
                            filing.
                        </p>

                        <ul className="text-theme-secondary">
                            <li>Monthly & yearly tracking</li>
                            <li>Payment-mode summaries</li>
                            <li>Excel export</li>
                        </ul>

                        <div className="alert theme-alert-info rounded-3">
                            <strong>Note:</strong> Consult a CA for final
                            filings.
                        </div>
                    </section>

                    {/* SECURITY */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">Security</h5>
                        <p className="text-theme-secondary">
                            Secure authentication with token-based access
                            control. Role-based permissions ensure only
                            authorized users can access sensitive data.{" "}
                        </p>
                    </section>

                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">💡 Why InvoHealth?</h5>

                        <ul className="text-theme-secondary">
                            <li>Fast & minimal — no unnecessary complexity</li>
                            <li>Built specifically for small clinics</li>
                            <li>
                                Clear financial insights without accounting
                                jargon
                            </li>
                            <li>Works seamlessly on mobile & desktop</li>
                        </ul>
                    </section>
                    {/* CONTACT */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">📧 Contact</h5>
                        <p className="text-theme-secondary mb-0">
                            Feedback & support:{" "}
                            <strong className="text-theme-primary">
                                <a
                                    href="mailto:agarwalabhed@gmail.com"
                                    className="text-theme-primary fw-semibold"
                                >
                                    agarwalabhed@gmail.com
                                </a>
                            </strong>
                        </p>
                    </section>

                    {/* DEV NOTE */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">👨‍💻 Developer Note</h5>
                        <p className="text-theme-secondary">
                            Developed by <strong>Abhed Agarwal</strong> -
                            focused on building practical, real-world software
                            solutions that simplify everyday workflows.
                        </p>
                    </section>

                    {/* FOOTER */}
                    <div className="text-center pt-3 border-top theme-border">
                        <small className="text-theme-secondary">
                            <span>InvoHealth • Version </span>
                            {process.env.REACT_APP_VERSION} <br />©{" "}
                            {new Date().getFullYear()} InvoHealth. All rights
                            reserved.
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
}
