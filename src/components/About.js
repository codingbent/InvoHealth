export default function About() {
    return (
        <div className="container py-4 py-lg-5">
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
                {/* HEADER */}
                <div className="bg-primary text-white text-center px-4 py-5">
                    <h2 className="fw-bold mb-2">InvoHealth</h2>
                    <p className="mb-0 opacity-75">
                        Lightweight clinic management & invoicing system
                    </p>
                </div>

                <div className="card-body p-4 p-lg-5">
                    {/* INTRO */}
                    <p className="lead text-center text-muted mb-4">
                        A simple, fast, and practical record-keeping solution
                        built specifically for small personal clinics.
                    </p>

                    {/* WHAT IS */}
                    <section className="mb-5">
                        <h5 className="fw-semibold mb-2">
                            📌 What is InvoHealth?
                        </h5>
                        <p className="text-muted">
                            InvoHealth is a personal clinic management and
                            billing application designed to simplify everyday
                            clinic operations. It helps doctors maintain
                            structured records without complex hospital-grade
                            systems.
                        </p>
                    </section>

                    {/* FEATURES */}
                    <section className="mb-5">
                        <h5 className="fw-semibold mb-3">🚀 Key Features</h5>

                        <div className="row g-3">
                            <div className="col-md-6">
                                <ul className="list-group list-group-flush">
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
                                        ✔ Multiple payment modes (Cash, UPI,
                                        Card, Bank)
                                    </li>
                                </ul>
                            </div>

                            <div className="col-md-6">
                                <ul className="list-group list-group-flush">
                                    <li className="list-group-item">
                                        ✔ Day-wise & month-wise income view
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Advanced filters (date, gender,
                                        service, payment)
                                    </li>
                                    <li className="list-group-item">
                                        ✔ PDF invoice generation
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Excel export for records
                                    </li>
                                    <li className="list-group-item">
                                        ✔ Fully responsive (mobile & desktop)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* PURPOSE */}
                    <section className="mb-5">
                        <h5 className="fw-semibold mb-2">🎯 Purpose</h5>
                        <p className="text-muted">
                            This software was built for a single private clinic
                            (my father’s clinic) to reduce manual paperwork and
                            make daily accounting easier. It is not intended for
                            hospitals or commercial SaaS usage.
                        </p>

                        <div className="alert alert-warning rounded-3 mt-3">
                            <strong>⚠ Disclaimer</strong>
                            <br />
                            InvoHealth is for{" "}
                            <strong>personal & educational use</strong>. It does
                            not comply with medical data regulations such as
                            HIPAA and should not be used for sensitive
                            large-scale patient data storage.
                        </div>
                    </section>

                    {/* ACCOUNTING */}
                    <section className="mb-5">
                        <h5 className="fw-semibold mb-2">
                            🧾 Accounting & ITR Support
                        </h5>
                        <p className="text-muted">
                            InvoHealth helps maintain clean financial records
                            that can be referenced during accounting and income
                            tax filing.
                        </p>

                        <ul className="text-muted">
                            <li>• Monthly & yearly income tracking</li>
                            <li>• Payment-mode wise summaries</li>
                            <li>• Exportable Excel sheets for CA review</li>
                        </ul>

                        <div className="alert alert-info rounded-3 mt-3">
                            <strong>Note:</strong>
                            <br />
                            This is not a GST or official accounting tool.
                            Always consult a certified CA for final filings.
                        </div>
                    </section>

                    {/* SECURITY */}
                    <section className="mb-5">
                        <h5 className="fw-semibold mb-2">🔐 Security</h5>
                        <p className="text-muted">
                            The system uses token-based authentication for
                            controlled access. Regular data exports and backups
                            are recommended.
                        </p>
                    </section>

                    {/* CONTACT */}
                    <section className="mb-5">
                        <h5 className="fw-semibold mb-2">📧 Contact</h5>
                        <p className="text-muted mb-0">
                            For feedback, feature suggestions, or support:
                        </p>
                        <strong>abhed.agl@gmail.com</strong>
                    </section>

                    {/* DEV NOTE */}
                    <section className="mb-4">
                        <h5 className="fw-semibold mb-2">👨‍💻 Developer Note</h5>
                        <p className="text-muted">
                            InvoHealth was developed by{" "}
                            <strong>Abhed Agarwal</strong>
                            {" "}as a real-world project to solve an actual clinic
                            workflow problem. The project focuses on simplicity,
                            performance, and usability.
                        </p>
                    </section>

                    {/* FOOTER */}
                    <div className="text-center pt-3 border-top">
                        <small className="text-muted">
                            App Version: v1.0.0
                            <br />© {new Date().getFullYear()} InvoHealth —
                            Personal & Educational Use Only
                        </small>
                    </div>
                </div>
            </div>
        </div>
    );
}
