export default function Privacy() {
    return (
        <div className="container py-5" style={{ maxWidth: "900px" }}>
            <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body p-4 p-md-5">
                    <h2 className="fw-bold text-center mb-3">Privacy Policy</h2>

                    <p className="text-theme-secondary text-center mb-4">
                        Last updated: {new Date().getFullYear()}
                    </p>

                    <hr />

                    <h5 className="mt-4">1. Introduction</h5>
                    <p className="text-theme-secondary">
                        InvoHealth respects your privacy and is committed to
                        protecting your personal and clinic information. This
                        Privacy Policy explains how we collect and use
                        information when you use our platform.
                    </p>

                    <h5 className="mt-4">2. Information We Collect</h5>
                    <p className="text-theme-secondary">
                        We may collect the following information when you
                        register and use the platform:
                    </p>

                    <ul className="text-theme-secondary">
                        <li>Name and contact information</li>
                        <li>Email address</li>
                        <li>Clinic information</li>
                        <li>Professional details</li>
                        <li>
                            Patient and appointment records entered by users
                        </li>
                    </ul>

                    <h5 className="mt-4">3. How We Use Information</h5>
                    <p className="text-theme-secondary">
                        Information collected is used to:
                    </p>

                    <ul className="text-theme-secondary">
                        <li>Provide clinic management features</li>
                        <li>Maintain and improve the platform</li>
                        <li>Communicate service updates</li>
                        <li>Ensure security and prevent misuse</li>
                    </ul>

                    <h5 className="mt-4">4. Data Ownership</h5>
                    <p className="text-theme-secondary">
                        Users retain ownership of the data they store on
                        InvoHealth. We do not claim ownership of patient or
                        clinic records entered by users.
                    </p>

                    <h5 className="mt-4">5. Data Security</h5>
                    <p className="text-theme-secondary">
                        We implement reasonable security measures to protect
                        user data stored within the platform. User account
                        passwords are securely hashed before being stored in our
                        database.
                        <br></br>
                        This means that passwords are not stored in plain text
                        and cannot be directly viewed by our system
                        administrators.
                        <br></br>
                        While we take appropriate steps to protect stored
                        information, no system can guarantee absolute security.
                        Users should take appropriate precautions such as using
                        strong passwords and protecting access to their
                        accounts.
                    </p>

                    <h5 className="mt-4">6. Third-Party Services</h5>
                    <p className="text-theme-secondary">
                        Payments and certain services may be processed through
                        third-party providers such as Razorpay. These services
                        may have their own privacy policies.
                    </p>

                    <h5 className="mt-4">7. Data Loss Disclaimer</h5>
                    <p className="text-theme-secondary">
                        Although we aim to maintain reliable data storage,
                        InvoHealth does not guarantee permanent availability of
                        stored data. Users are encouraged to keep backups of
                        important information.
                    </p>

                    <h5 className="mt-4">8. Changes to Privacy Policy</h5>
                    <p className="text-theme-secondary">
                        This Privacy Policy may be updated periodically to
                        reflect changes in our services or legal requirements.
                    </p>

                    <h5 className="mt-4">9. Contact</h5>
                    <p className="text-theme-secondary">
                        For privacy-related inquiries, please contact:
                        invohealth.app@gmail.com
                    </p>
                </div>
            </div>
        </div>
    );
}
