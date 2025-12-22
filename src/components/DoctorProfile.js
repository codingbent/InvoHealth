import { useEffect, useState } from "react";

export default function DoctorProfile() {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [doctor, setDoctor] = useState(null);
    const [editData, setEditData] = useState({});
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [loading, setLoading] = useState(true);
    const [staffName, setStaffName] = useState("");
    const [staffPhone, setStaffPhone] = useState("");
    const [staffRole, setStaffRole] = useState("");
    const [staffList, setStaffList] = useState([]);

    // ================= FETCH DOCTOR =================
    const fetchDoctor = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/getdoc`, {
                headers: { "auth-token": localStorage.getItem("token") },
            });

            const data = await res.json();
            if (data.success) {
                const doc = data.doctor;
                setDoctor(doc);
                setEditData({
                    ...doc,
                    degree: doc.degree?.length ? doc.degree : [""],
                    address: {
                        line1: doc.address?.line1 || "",
                        line2: doc.address?.line2 || "",
                        line3: doc.address?.line3 || "",
                        city: doc.address?.city || "",
                        state: doc.address?.state || "",
                        pincode: doc.address?.pincode || "",
                    },
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctor();
    }, []);

    // ================= EDIT PROFILE =================
    const handleEditChange = (e) =>
        setEditData({ ...editData, [e.target.name]: e.target.value });

    const handleAddressChange = (e) =>
        setEditData({
            ...editData,
            address: { ...editData.address, [e.target.name]: e.target.value },
        });

    const handleDegreeChange = (index, value) => {
        const updated = [...editData.degree];
        updated[index] = value;
        setEditData({ ...editData, degree: updated });
    };

    const addDegreeField = () =>
        setEditData({ ...editData, degree: [...editData.degree, ""] });

    const removeDegreeField = (index) => {
        const updated = [...editData.degree];
        updated.splice(index, 1);
        setEditData({ ...editData, degree: updated });
    };
    const fetchStaff = async () => {
        const res = await fetch(`${API_BASE_URL}/api/staff`, {
            headers: { "auth-token": localStorage.getItem("token") },
        });
        const data = await res.json();
        if (data.success) setStaffList(data.staff);
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleAddStaff = async () => {
        if (!staffName || !staffPhone || !staffRole) {
            alert("All fields required");
            return;
        }

        const res = await fetch(`${API_BASE_URL}/api/staff/add`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "auth-token": localStorage.getItem("token"),
            },
            body: JSON.stringify({
                name: staffName,
                phone: staffPhone.replace(/\D/g, "").slice(-10),
                role: staffRole,
            }),
        });

        const data = await res.json();

        if (data.success) {
            fetchStaff();
            setStaffName("");
            setStaffPhone("");
            setStaffRole("");
        } else {
            alert(data.error);
        }
    };

    const handleSaveProfile = async () => {
        const payload = {
            ...editData,
            degree: editData.degree.filter((d) => d.trim() !== ""),
        };

        const res = await fetch(`${API_BASE_URL}/api/auth/updatedoc`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "auth-token": localStorage.getItem("token"),
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
            setDoctor(data.doctor);
            alert("Profile updated successfully");
        } else {
            alert("Profile update failed");
        }
    };
const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    // ✅ validations
    if (!currentPassword || !newPassword || !confirmPassword) {
        alert("All password fields are required");
        return;
    }

    if (newPassword.length < 6) {
        alert("New password must be at least 6 characters");
        return;
    }

    if (newPassword !== confirmPassword) {
        alert("New password and confirm password do not match");
        return;
    }

    try {
        const res = await fetch(
            `${API_BASE_URL}/api/auth/change-password`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": localStorage.getItem("token"),
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            }
        );

        const data = await res.json();

        if (data.success) {
            alert("Password updated successfully ✅");

            // reset fields
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } else {
            alert(data.error || "Password update failed");
        }
    } catch (err) {
        console.error(err);
        alert("Server error while changing password");
    }
};

    if (loading) return <p className="text-center mt-4">Loading...</p>;
    if (!doctor)
        return <p className="text-center mt-4">Error loading profile</p>;

    return (
        <div className="container mt-4">
            {/* ================= PROFILE CARD ================= */}
            <div className="card shadow-sm border-0 mb-3">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h4 className="mb-1">{doctor.name}</h4>
                            <small className="text-muted">
                                {doctor.clinicName}
                            </small>
                        </div>

                        <button
                            className="btn btn-outline-primary btn-sm"
                            data-bs-toggle="modal"
                            data-bs-target="#editProfileModal"
                        >
                            ✏️ Edit Profile
                        </button>
                    </div>

                    <hr />

                    <div className="row g-4">
                        <div className="col-md-6">
                            <p>
                                <strong>Email:</strong> {doctor.email}
                            </p>
                            <p>
                                <strong>Phone:</strong> {doctor.phone}
                            </p>
                            <p>
                                <strong>Reg No:</strong>{" "}
                                {doctor.regNumber || "N/A"}
                            </p>
                        </div>

                        <div className="col-md-6">
                            <p>
                                <strong>Degree:</strong>{" "}
                                {doctor.degree?.join(", ")}
                            </p>
                        </div>

                        <div className="col-12">
                            <p className="mb-0">
                                <strong>Address:</strong>
                                <br />
                                {doctor.address?.line1}
                                <br />
                                {doctor.address?.line2}
                                <br />
                                {doctor.address?.city}, {doctor.address?.state}{" "}
                                - {doctor.address?.pincode}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= ACCORDION ================= */}
            <div className="accordion" id="doctorAccordion">
                {/* ================= STAFF MANAGEMENT ================= */}
                <div className="accordion-item">
                    <h2 className="accordion-header">
                        <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#staffSection"
                        >
                            👥 Staff Management
                        </button>
                    </h2>

                    <div
                        id="staffSection"
                        className="accordion-collapse collapse"
                        data-bs-parent="#doctorAccordion"
                    >
                        <div className="accordion-body">
                            <h6 className="fw-semibold mb-3">Add Staff</h6>

                            <div className="row g-2 mb-3">
                                <div className="col-md-4">
                                    <input
                                        className="form-control"
                                        placeholder="Staff Name"
                                        value={staffName}
                                        onChange={(e) =>
                                            setStaffName(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-md-4">
                                    <input
                                        className="form-control"
                                        placeholder="Phone (10 digits)"
                                        value={staffPhone}
                                        onChange={(e) =>
                                            setStaffPhone(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-md-4">
                                    <select
                                        className="form-select"
                                        value={staffRole}
                                        onChange={(e) =>
                                            setStaffRole(e.target.value)
                                        }
                                    >
                                        <option value="">Select Role</option>
                                        <option value="receptionist">
                                            Receptionist
                                        </option>
                                        <option value="assistant">
                                            Assistant
                                        </option>
                                        <option value="nurse">Nurse</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                className="btn btn-outline-primary btn-sm mb-3"
                                onClick={handleAddStaff}
                            >
                                ➕ Add Staff
                            </button>

                            <hr />

                            <h6 className="fw-semibold mb-2">Staff List</h6>

                            {staffList.length === 0 ? (
                                <p className="text-muted">No staff added yet</p>
                            ) : (
                                <table className="table table-sm table-bordered">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Role</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffList.map((s) => (
                                            <tr key={s._id}>
                                                <td>{s.name}</td>
                                                <td>{s.phone}</td>
                                                <td>{s.role}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            <small className="text-muted">
                                Staff can login using OTP with their phone
                                number
                            </small>
                        </div>
                    </div>
                </div>

                {/* ================= CHANGE PASSWORD ================= */}
                <div className="accordion-item">
                    <h2 className="accordion-header">
                        <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#passwordSection"
                        >
                            🔒 Change Password
                        </button>
                    </h2>

                    <div
                        id="passwordSection"
                        className="accordion-collapse collapse"
                        data-bs-parent="#doctorAccordion"
                    >
                        <div className="accordion-body">
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <input
                                        type="password"
                                        className="form-control"
                                        placeholder="Current Password"
                                        value={passwordData.currentPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                currentPassword: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="col-md-4">
                                    <input
                                        type="password"
                                        className="form-control"
                                        placeholder="New Password"
                                        value={passwordData.newPassword}
                                        onChange={(e) =>
                                            setPasswordData({
                                                ...passwordData,
                                                newPassword: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div className="col-md-4">
                                    <input
                                        type="password"
                                        className="form-control"
                                        placeholder="Confirm Password"
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

                            <button
                                className="btn btn-outline-danger btn-sm mt-3"
                                onClick={handleChangePassword}
                            >
                                🔄 Update Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= EDIT PROFILE MODAL ================= */}
            <div
                className="modal fade"
                id="editProfileModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit Profile</h5>
                            <button
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body">
                            {/* BASIC INFO */}
                            <h6 className="text-uppercase text-muted mb-3">
                                Basic Information
                            </h6>

                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label">Name</label>
                                    <input
                                        className="form-control"
                                        name="name"
                                        value={editData.name}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">
                                        Clinic Name
                                    </label>
                                    <input
                                        className="form-control"
                                        name="clinicName"
                                        value={editData.clinicName}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Phone</label>
                                    <input
                                        className="form-control"
                                        name="phone"
                                        value={editData.phone}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">
                                        Registration Number
                                    </label>
                                    <input
                                        className="form-control"
                                        name="regNumber"
                                        value={editData.regNumber}
                                        onChange={handleEditChange}
                                    />
                                </div>
                            </div>

                            {/* DEGREE */}
                            <h6 className="text-uppercase text-muted mb-3">
                                Qualifications
                            </h6>

                            {editData.degree.map((deg, index) => (
                                <div key={index} className="d-flex mb-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter degree"
                                        value={deg}
                                        onChange={(e) =>
                                            handleDegreeChange(
                                                index,
                                                e.target.value
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger ms-2"
                                        onClick={() => removeDegreeField(index)}
                                        disabled={editData.degree.length === 1}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mt-2 mb-4"
                                onClick={addDegreeField}
                            >
                                + Add Degree
                            </button>

                            {/* ADDRESS */}
                            <h6 className="text-uppercase text-muted mb-3">
                                Clinic Address
                            </h6>

                            <div className="row g-3">
                                <div className="col-12">
                                    <label className="form-label">
                                        Address Line 1
                                    </label>
                                    <input
                                        className="form-control"
                                        name="line1"
                                        value={editData.address.line1}
                                        onChange={handleAddressChange}
                                    />
                                </div>

                                <div className="col-12">
                                    <label className="form-label">
                                        Address Line 2 (optional)
                                    </label>
                                    <input
                                        className="form-control"
                                        name="line2"
                                        value={editData.address.line2}
                                        onChange={handleAddressChange}
                                    />
                                </div>

                                <div className="col-12">
                                    <label className="form-label">
                                        Address Line 3 (optional)
                                    </label>
                                    <input
                                        className="form-control"
                                        name="line3"
                                        value={editData.address.line3}
                                        onChange={handleAddressChange}
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">City</label>
                                    <input
                                        className="form-control"
                                        name="city"
                                        value={editData.address.city}
                                        onChange={handleAddressChange}
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">State</label>
                                    <input
                                        className="form-control"
                                        name="state"
                                        value={editData.address.state}
                                        onChange={handleAddressChange}
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label">
                                        Pincode
                                    </label>
                                    <input
                                        className="form-control"
                                        name="pincode"
                                        value={editData.address.pincode}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-outline-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                data-bs-dismiss="modal"
                                onClick={handleSaveProfile}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
