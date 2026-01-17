import { useEffect, useState, useCallback, useMemo } from "react";
import { authFetch } from "./authfetch";

export default function DoctorProfile(props) {
    const [doctor, setDoctor] = useState(null);
    const [staffList, setStaffList] = useState([]);
    const [staffName, setStaffName] = useState("");
    const [staffPhone, setStaffPhone] = useState("");
    const [staffRole, setStaffRole] = useState("");
    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [editStaffData, setEditStaffData] = useState({
        _id: "",
        name: "",
        phone: "",
        role: "",
    });
    const [editData, setEditData] = useState({});

    // ================= FETCH DOCTOR =================
    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        []
    );

    const fetchDoctor = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/auth/getdoc`);
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
        }
    }, [API_BASE_URL]);

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

        const res = await authFetch(`${API_BASE_URL}/api/auth/updatedoc`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.success) {
            setDoctor(data.doctor);
            props.showAlert("Profile updated successfully", "success");
        } else {
            props.showAlert("Profile update failed", "danger");
        }
    };
    // ================= FETCH STAFF =================
    const fetchStaff = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE_URL}/api/auth/fetch-staff`);
            const data = await res.json();
            if (data.success) setStaffList(data.staff);
        } catch (err) {
            console.error(err);
        }
    }, [API_BASE_URL]);

    useEffect(() => {
        fetchDoctor();
        fetchStaff();
    }, [fetchDoctor, fetchStaff]);

    // ================= ADD STAFF =================
    const handleAddStaff = async () => {
        if (!staffName || !staffPhone || !staffRole) {
            props.showAlert("All fields required", "danger");
            return;
        }

        const res = await authFetch(`${API_BASE_URL}/api/auth/add-staff`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
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

    // ================= CHANGE PASSWORD =================
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

        const res = await authFetch(
            `${API_BASE_URL}/api/auth/change-password`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
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
            props.showAlert(
                data.error || "Server Error try again later",
                "danger"
            );
        }
    };

    const deletestaff = async (staffId) => {
        const confirmDelete = window.confirm(
            "Do you want to delete this staff member?"
        );
        if (!confirmDelete) return;
        const res = await authFetch(
            `${API_BASE_URL}/api/auth/delete-staff/${staffId}`,
            {
                method: "DELETE",
            }
        );

        const data = await res.json();
        if (data.success) {
            fetchStaff();
        } else {
            alert(data.error);
        }
    };
    const openEditStaffModal = (staff) => {
        setEditStaffData({
            _id: staff._id,
            name: staff.name,
            phone: staff.phone,
            role: staff.role,
        });
    };

    const editstaff = async () => {
        const res = await authFetch(
            `${API_BASE_URL}/api/auth/edit-staff/${editStaffData._id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: editStaffData.name,
                    phone: editStaffData.phone,
                    role: editStaffData.role,
                }),
            }
        );

        const data = await res.json();

        if (data.success) {
            fetchStaff();
            document.getElementById("editStaffModalClose").click();
        } else {
            alert(data.error);
        }
    };

    if (!doctor)
        return (
            <div className="container my-4">
                <div className="card shadow-sm border-0 rounded-4">
                    <div className="card-body">
                        {/* Header Skeleton */}
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div
                                className="placeholder rounded-circle"
                                style={{ width: 44, height: 44 }}
                            />
                            <div className="flex-grow-1">
                                <div className="placeholder col-5 mb-2" />
                                <div className="placeholder col-3" />
                            </div>
                        </div>

                        {/* Info Skeleton */}
                        <div className="row g-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="col-6 col-md-4">
                                    <div className="placeholder-glow">
                                        <div
                                            className="placeholder col-12 rounded-3"
                                            style={{ height: 56 }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );

    return (
        <div className="container py-3 py-md-4">
            {/* ================= DOCTOR PROFILE ================= */}
            <div className="card shadow-sm border-0 mb-3">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h4 className="mb-1">{doctor.name}</h4>
                            <small className="text-theme-muted">
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

                        {/* <div className="col-12">
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
                        </div> */}
                    </div>
                </div>
            </div>

            {/* ================= STAFF MANAGEMENT ================= */}
            <div className="accordion my-4" id="staffAccordion">
                <div className="accordion-item border-0 shadow-sm rounded-4">
                    <h2 className="accordion-header">
                        <button
                            className="accordion-button collapsed fw-semibold rounded-4"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#staffSection"
                            aria-expanded="false"
                            aria-controls="staffSection"
                        >
                            👥 Staff Management
                        </button>
                    </h2>

                    <div
                        id="staffSection"
                        className="accordion-collapse collapse"
                        data-bs-parent="#staffAccordion"
                    >
                        <div className="accordion-body">
                            {/* ================= ADD STAFF ================= */}
                            <div className="row g-3 mb-3">
                                <div className="col-12 col-md-4">
                                    <label className="form-label small text-theme-muted">
                                        Staff Name
                                    </label>
                                    <input
                                        className="form-control rounded-3"
                                        placeholder="Enter name"
                                        value={staffName}
                                        onChange={(e) =>
                                            setStaffName(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-12 col-md-4">
                                    <label className="form-label small text-theme-muted">
                                        Phone Number
                                    </label>
                                    <input
                                        className="form-control rounded-3"
                                        placeholder="10 digit number"
                                        value={staffPhone}
                                        onChange={(e) =>
                                            setStaffPhone(e.target.value)
                                        }
                                    />
                                </div>

                                <div className="col-12 col-md-4">
                                    <label className="form-label small text-theme-muted">
                                        Role
                                    </label>
                                    <select
                                        className="form-select rounded-3"
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
                                className="btn btn-primary w-100 w-md-auto mb-4 rounded-3"
                                onClick={handleAddStaff}
                            >
                                ➕ Add Staff
                            </button>

                            <hr />

                            {/* ================= STAFF LIST ================= */}
                            {staffList.length === 0 ? (
                                <p className="text-theme-muted text-center mb-0">
                                    No staff added yet
                                </p>
                            ) : (
                                <div className="row g-3">
                                    {staffList.map((s) => (
                                        <div
                                            key={s._id}
                                            className="col-12 col-md-6"
                                        >
                                            <div className="card h-100 border-0 shadow-sm rounded-4">
                                                <div className="card-body">
                                                    <h6 className="fw-bold mb-1">
                                                        {s.name}
                                                    </h6>

                                                    <div className="small text-theme-muted mb-2">
                                                        📞 {s.phone}
                                                    </div>

                                                    <span className="badge bg-light text-dark border mb-3">
                                                        {s.role}
                                                    </span>

                                                    <div className="d-flex gap-2 mt-3">
                                                        <button
                                                            className="btn btn-sm btn-outline-warning flex-fill rounded-3"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#editStaffModal"
                                                            onClick={() =>
                                                                openEditStaffModal(
                                                                    s
                                                                )
                                                            }
                                                        >
                                                            ✏️ Edit
                                                        </button>

                                                        <button
                                                            className="btn btn-sm btn-outline-danger flex-fill rounded-3"
                                                            onClick={() =>
                                                                deletestaff(
                                                                    s._id
                                                                )
                                                            }
                                                        >
                                                            🗑 Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= EDIT STAFF MODAL ================= */}
            <div
                className="modal fade"
                id="editStaffModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-dialog-centered modal-sm modal-md">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header">
                            <h5 className="modal-title fw-semibold">
                                Edit Staff
                            </h5>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                id="editStaffModalClose"
                            />
                        </div>

                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input
                                    className="form-control"
                                    value={editStaffData.name}
                                    onChange={(e) =>
                                        setEditStaffData({
                                            ...editStaffData,
                                            name: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Phone</label>
                                <input
                                    className="form-control"
                                    value={editStaffData.phone}
                                    onChange={(e) =>
                                        setEditStaffData({
                                            ...editStaffData,
                                            phone: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Role</label>
                                <select
                                    className="form-select"
                                    value={editStaffData.role}
                                    onChange={(e) =>
                                        setEditStaffData({
                                            ...editStaffData,
                                            role: e.target.value,
                                        })
                                    }
                                >
                                    <option value="receptionist">
                                        Receptionist
                                    </option>
                                    <option value="assistant">Assistant</option>
                                    <option value="nurse">Nurse</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-footer flex-nowrap">
                            <button
                                className="btn btn-outline-secondary w-50"
                                data-bs-dismiss="modal"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary w-50"
                                onClick={editstaff}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= CHANGE PASSWORD ================= */}
            <div className="accordion my-4" id="doctorAccordion">
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
                        data-bs-parent="#doctorAccordion"
                    >
                        <div className="accordion-body">
                            <div className="row g-3">
                                {/* Current Password */}
                                <div className="col-12 col-md-4">
                                    <label className="form-label small text-theme-muted">
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
                                    <label className="form-label small text-theme-muted">
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
                                    <label className="form-label small text-theme-muted">
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

                            {/* Action */}
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
                            <h6 className="text-uppercase text-theme-muted mb-3">
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
                            <h6 className="text-uppercase text-theme-muted mb-3">
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
                            <h6 className="text-uppercase text-theme-muted mb-3">
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
