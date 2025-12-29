import { useEffect, useState } from "react";

const API_BASE_URL =
    process.env.NODE_ENV === "production"
        ? "https://gmsc-backend.onrender.com"
        : "http://localhost:5001";

export default function StaffProfile(props) {
    const [staff, setStaff] = useState(null);
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // ✅ Fetch staff ONLY
    const fetchStaff = async () => {
        const res = await fetch(`${API_BASE_URL}/api/auth/staff`, {
            headers: {
                "auth-token": localStorage.getItem("token"),
            },
        });

        const data = await res.json();
        if (data.success) setStaff(data.staff);
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleChangePassword = async () => {
        const { currentPassword, newPassword, confirmPassword } = passwordData;

        if (!currentPassword || !newPassword || !confirmPassword) {
            props.showAlert("All fields required", "danger");
            return;
        }
        if (newPassword !== confirmPassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }

        const res = await fetch(
            `${API_BASE_URL}/api/auth/staff/change-password`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": localStorage.getItem("token"),
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            }
        );

        const data = await res.json();
        if (data.success) {
            props.showAlert("Password updated", "success");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            }); 
        } else {
            props.showAlert(data.error||"Server Error try again later", "danger");
        }
    };

    if (!staff)
        return (
            <div className="d-flex flex-column justify-content-center align-items-center py-5">
                <div
                    className="spinner-border text-primary mb-3"
                    role="status"
                />
                <span className="text-muted">Loading patient details…</span>
            </div>
        );

    return (
        <div className="container py-3 py-md-4" style={{ maxWidth: "900px" }}>
            {/* ================= STAFF PROFILE ================= */}
            <div className="card border-0 shadow-sm rounded-4 mb-4">
                <div className="card-body">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                        <div>
                            <h4 className="mb-1 fw-semibold">{staff.name}</h4>
                            <span className="badge bg-primary-subtle text-primary">
                                {staff.role}
                            </span>
                        </div>

                        <div className="text-muted small">📞 {staff.phone}</div>
                    </div>
                </div>
            </div>

            {/* ================= CHANGE PASSWORD (ACCORDION) ================= */}
            <div className="accordion" id="staffAccordion">
                <div className="accordion-item border-0 shadow-sm rounded-4">
                    <h2 className="accordion-header">
                        <button
                            className="accordion-button collapsed fw-semibold rounded-4"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#passwordSection"
                            aria-expanded="false"
                            aria-controls="passwordSection"
                        >
                            🔒 Change Password
                        </button>
                    </h2>

                    <div
                        id="passwordSection"
                        className="accordion-collapse collapse"
                        data-bs-parent="#staffAccordion"
                    >
                        <div className="accordion-body">
                            <div className="row g-3">
                                {/* Current Password */}
                                <div className="col-12 col-md-4">
                                    <label className="form-label small text-muted">
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control rounded-3"
                                        placeholder="••••••••"
                                        value={passwordData.currentPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                currentPassword: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                {/* New Password */}
                                <div className="col-12 col-md-4">
                                    <label className="form-label small text-muted">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control rounded-3"
                                        placeholder="Minimum 6 characters"
                                        value={passwordData.newPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                newPassword: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                {/* Confirm Password */}
                                <div className="col-12 col-md-4">
                                    <label className="form-label small text-muted">
                                        Confirm Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control rounded-3"
                                        placeholder="Re-enter password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                confirmPassword: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>

                            <div className="d-flex justify-content-end mt-4">
                                <button
                                    className="btn btn-danger px-4 rounded-3"
                                    onClick={handleChangePassword}
                                >
                                    🔄 Update Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
