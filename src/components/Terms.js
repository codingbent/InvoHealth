import React from "react";

export default function Terms() {
    return (
        <div className="container py-5" style={{ maxWidth: "900px" }}>
            <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body p-4 p-md-5">
                    <h2 className="fw-bold text-center mb-3">
                        Terms & Conditions
                    </h2>

                    <p className="text-theme-secondary text-center mb-4">
                        Last updated: {new Date().getFullYear()}
                    </p>

                    <hr />

                    <h5 className="mt-4">1. Acceptance of Terms</h5>
                    <p className="text-theme-secondary">
                        By accessing or using InvoHealth, you agree to comply
                        with these Terms & Conditions. If you do not agree with
                        any part of these terms, please discontinue use of the
                        platform.
                    </p>

                    <h5 className="mt-4">2. Nature of the Service</h5>
                    <p className="text-theme-secondary">
                        InvoHealth is a clinic management platform designed to
                        help healthcare professionals manage patients,
                        appointments, billing, and clinic operations. The
                        platform does not provide medical advice, diagnosis, or
                        treatment.
                    </p>

                    <h5 className="mt-4">3. Early Stage / Beta Software</h5>
                    <p className="text-theme-secondary">
                        InvoHealth is currently an early-stage product and may
                        contain bugs or incomplete features. Some features may
                        change, improve, or be removed over time as the platform
                        evolves.
                    </p>

                    <h5 className="mt-4">4. Data Storage Disclaimer</h5>
                    <p className="text-theme-secondary">
                        While we strive to maintain reliable storage of user
                        data, InvoHealth does not guarantee permanent storage or
                        availability of information. Users are responsible for
                        maintaining backups of important clinic or patient
                        records.
                    </p>

                    <h5 className="mt-4">5. User Responsibilities</h5>
                    <p className="text-theme-secondary">
                        Users agree to provide accurate information, maintain
                        confidentiality of login credentials, and use the
                        platform in accordance with applicable laws and medical
                        regulations.
                    </p>

                    <h5 className="mt-4">6. Subscription & Payments</h5>
                    <p className="text-theme-secondary">
                        Some features may require a paid subscription. Payments
                        are processed securely through third-party payment
                        providers such as Razorpay.
                    </p>

                    <h5 className="mt-4">7. Limitation of Liability</h5>
                    <p className="text-theme-secondary">
                        InvoHealth shall not be liable for any data loss,
                        financial loss, business interruption, or medical
                        decisions made using information stored on the platform.
                    </p>

                    <h5 className="mt-4">8. Service Availability</h5>
                    <p className="text-theme-secondary">
                        We aim to maintain high uptime but cannot guarantee
                        uninterrupted service. Maintenance, updates, or
                        technical issues may occasionally cause downtime.
                    </p>

                    <h5 className="mt-4">9. Changes to Terms</h5>
                    <p className="text-theme-secondary">
                        These terms may be updated periodically to reflect
                        improvements or changes in the platform.
                    </p>

                    <h5 className="mt-4">10. Contact</h5>
                    <p className="text-theme-secondary">
                        For any questions regarding these Terms & Conditions,
                        please contact: agarwalabhed@gmail.com
                    </p>
                </div>
            </div>
        </div>
    );
}
