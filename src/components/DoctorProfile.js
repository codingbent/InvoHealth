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

    // ================= CHANGE PASSWORD =================
    const handlePasswordChange = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        const res = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "auth-token": localStorage.getItem("token"),
            },
            body: JSON.stringify({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            }),
        });

        const data = await res.json();
        if (data.success) {
            alert("Password updated successfully");
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        } else {
            alert(data.message || "Password update failed");
        }
    };

    if (loading) return <p className="text-center mt-4">Loading...</p>;
    if (!doctor)
        return <p className="text-center mt-4">Error loading profile</p>;

    return (
        <div className="container mt-4">
            {/* ================= PROFILE CARD ================= */}
            <div className="card shadow-sm border-0">
                <div className="card-body">
                    <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center mb-3">
                        <div>
                            <h4 className="mb-1">{doctor.name}</h4>
                            <small className="text-muted">
                                {doctor.clinicName}
                            </small>
                        </div>

                        <div className="d-flex gap-2">
                            <button
                                className="btn btn-outline-primary btn-sm"
                                data-bs-toggle="modal"
                                data-bs-target="#editProfileModal"
                            >
                                ✏️ Edit Profile
                            </button>

                            <button
                                className="btn btn-outline-danger btn-sm"
                                data-bs-toggle="modal"
                                data-bs-target="#changePasswordModal"
                            >
                                🔒 Change Password
                            </button>
                        </div>
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

            {/* ================= EDIT PROFILE MODAL ================= */}
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

            {/* ================= CHANGE PASSWORD MODAL ================= */}
            <div className="modal fade" id="changePasswordModal" tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Change Password</h5>
                            <button
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <input
                                type="password"
                                className="form-control mb-2"
                                placeholder="Current Password"
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        currentPassword: e.target.value,
                                    })
                                }
                            />
                            <input
                                type="password"
                                className="form-control mb-2"
                                placeholder="New Password"
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        newPassword: e.target.value,
                                    })
                                }
                            />
                            <input
                                type="password"
                                className="form-control"
                                placeholder="Confirm Password"
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        confirmPassword: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                data-bs-dismiss="modal"
                                onClick={handlePasswordChange}
                            >
                                Update Password
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
