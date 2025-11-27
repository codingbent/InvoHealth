export default function About() {
    return (
        <div className="container py-5">
            <div className="card shadow-sm p-4">
                <h2 className="text-center mb-3">About InvoHealth</h2>

                <p className="lead text-center text-muted">
                    A simple, fast and secure clinic management & invoicing system.
                </p>

                <hr />

                <h4>📌 What is InvoHealth?</h4>
                <p>
                    InvoHealth is a lightweight and easy-to-use clinic management platform
                    designed for doctors who want a fast and reliable system to manage:
                </p>
                <ul>
                    <li>✔ Patient records</li>
                    <li>✔ Appointments & visit history</li>
                    <li>✔ Services and billing</li>
                    <li>✔ Auto-generated invoices (PDF)</li>
                    <li>✔ Secure Excel exports</li>
                </ul>

                <hr />

                <h4>🎯 Our Mission</h4>
                <p>
                    To provide doctors and clinics a powerful yet simple digital tool that 
                    helps them save time, reduce paperwork, and deliver a better experience 
                    to their patients.
                </p>

                <hr />

                <h4>🚀 Key Features</h4>
                <ul>
                    <li>➤ Add, edit and manage patient profiles</li>
                    <li>➤ Track appointments and visits by date</li>
                    <li>➤ Auto-calculate invoices with services & pricing</li>
                    <li>➤ Professionally formatted PDF invoice generator</li>
                    <li>➤ Download filtered patient reports in Excel</li>
                    <li>➤ Mobile-first modern UI</li>
                </ul>

                <hr />

                <h4>🔐 Security & Privacy</h4>
                <p>
                    Your data is stored securely, protected with authentication, and never shared 
                    with any external system. Only the logged-in doctor can access the clinic records.
                </p>

                <hr />

                <h4>👨‍⚕️ About the Developer</h4>
                <p>
                    This application is built and optimized to help clinics go digital effortlessly.
                    For support or custom enhancements, please reach out anytime.
                </p>

                <div className="text-center mt-4">
                    <small className="text-muted">
                        © {new Date().getFullYear()} InvoHealth — All Rights Reserved.
                    </small>
                </div>
            </div>
        </div>
    );
}
