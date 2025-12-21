export default function About() {
    return (
        <div className="container py-5">
            <div className="card shadow-sm p-4">
                <h2 className="text-center mb-3">About InvoHealth</h2>

                <p className="lead text-center text-muted">
                    A simple and lightweight record-keeping system for personal
                    clinic use.
                </p>

                <hr />

                <h4>📌 What is InvoHealth?</h4>
                <p>
                    InvoHealth is a basic clinic management and invoicing
                    application developed for personal and educational purposes.
                    It helps maintain:
                </p>
                <ul>
                    <li>✔ Patient records</li>
                    <li>✔ Appointment & visit history</li>
                    <li>✔ Services and billing amounts</li>
                    <li>✔ Auto-generated PDF invoices</li>
                    <li>✔ Downloadable Excel records</li>
                </ul>

                <hr />

                <h4>🎯 Purpose of This Software</h4>
                <p>
                    This system was built specifically for a single private
                    clinic (my father's clinic) to make daily management easier.
                    It is NOT intended for hospitals, commercial distribution,
                    or multi-doctor setups.
                </p>

                <div className="alert alert-warning mt-3">
                    <strong>⚠ Disclaimer:</strong>
                    <br />
                    This application is strictly for{" "}
                    <strong>personal and educational use</strong>. It does NOT
                    meet medical record standards (HIPAA, etc.) and should NOT
                    be used for storing sensitive patient data in a
                    professional/public environment.
                </div>

                <hr />

                <h4>🧾 ITR & Accounting Support</h4>
                <p>
                    InvoHealth provides simple downloadable reports (Excel + PDF
                    invoices), which can be used as a reference for:
                </p>
                <ul>
                    <li>• Tracking monthly/annual clinic income</li>
                    <li>
                        • Reviewing total consultations and services provided
                    </li>
                    <li>
                        • Supporting calculations during income tax return (ITR)
                        filing
                    </li>
                </ul>

                <div className="alert alert-info mt-2">
                    <strong>Note:</strong>
                    <br />
                    While InvoHealth helps maintain clean and organized records
                    that can assist during ITR filing, it is{" "}
                    <strong>not an official accounting or GST tool</strong>.
                    Final tax calculations should be reviewed by a CA or tax
                    professional.
                </div>

                <hr />

                <h4>🚀 Features</h4>
                <ul>
                    <li>➤ Add, view, and update patient profiles</li>
                    <li>➤ Manage appointments and billing</li>
                    <li>➤ Generate professional PDF invoices</li>
                    <li>➤ Export filtered records for reporting</li>
                    <li>➤ Works smoothly on both mobile and desktop</li>
                </ul>

                <hr />

                <h4>🔐 Security Note</h4>
                <p>
                    The system uses a token-based login for basic security.
                    However, it is{" "}
                    <strong>
                        not designed for large-scale sensitive medical data
                        storage
                    </strong>
                    .
                </p>

                <p className="text-muted">
                    All data entered into the system remains the sole property
                    of the clinic. Users are advised to regularly export and
                    back up their records.
                </p>

                <hr />

                <h4>📧 Contact</h4>
                <p>
                    For support, feedback, or feature requests:
                    <br />
                    <strong>Email:</strong> abhed.agl@gmail.com
                </p>

                <hr />

                <h4>👨‍💻 Developer Note</h4>
                <p>
                    InvoHealth was developed by Abhed Agarwal as a personal
                    project to help his father manage clinic operations more
                    efficiently. If you wish to add new features or customize
                    the system, feel free to reach out.
                </p>

                <div className="text-center mt-4">
                    <small className="text-muted">
                        App Version: v1.0.0
                        <br />© {new Date().getFullYear()} InvoHealth — Personal
                        & Educational Use Only.
                    </small>
                </div>
            </div>
        </div>
    );
}
