import { useEffect, useState } from "react";

export default function DoctorProfile() {
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const [doctor, setDoctor] = useState(null);
    const [editData, setEditData] = useState({});
    const [loading, setLoading] = useState(true);

    // Fetch doctor details
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
                        city: doc.address?.city || "",
                        state: doc.address?.state || "",
                        pincode: doc.address?.pincode || "",
                    },
                });
            }
        } catch (err) {
            console.error("Error fetching doctor:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoctor();
    }, []);

    const handleEditChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const handleAddressChange = (e) => {
        setEditData({
            ...editData,
            address: { ...editData.address, [e.target.name]: e.target.value },
        });
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...editData,
                degree: editData.degree.filter((d) => d.trim() !== ""),
            };

            if (payload.degree.length === 0) {
                alert("Please add at least one degree");
                return;
            }

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
                const doc = data.doctor;

                setDoctor(doc);
                setEditData({
                    ...doc,
                    degree: doc.degree?.length ? doc.degree : [""],
                    address: {
                        line1: doc.address?.line1 || "",
                        line2: doc.address?.line2 || "",
                        city: doc.address?.city || "",
                        state: doc.address?.state || "",
                        pincode: doc.address?.pincode || "",
                    },
                });
            } else {
                alert("Update failed");
            }
        } catch (err) {
            console.error("Error updating doctor:", err);
            alert("Server error");
        }
    };

    const handleDegreeChange = (index, value) => {
        const updated = [...editData.degree];
        updated[index] = value;
        setEditData({ ...editData, degree: updated });
    };

    const addDegreeField = () => {
        setEditData({
            ...editData,
            degree: [...editData.degree, ""],
        });
    };

    const removeDegreeField = (index) => {
        const updated = [...editData.degree];
        updated.splice(index, 1);
        setEditData({ ...editData, degree: updated });
    };

    if (loading) return <p>Loading...</p>;
    if (!doctor) return <p>Error loading profile</p>;

    return (
        <div className="container mt-4">
            <h2 className="mb-4 fw-bold">Doctor Profile</h2>

            {/* ================= PROFILE CARD ================= */}
            <div className="card shadow-sm border-0 mb-4">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h4 className="mb-1">{doctor.name}</h4>
                            <small className="text-muted">
                                {doctor.clinicName}
                            </small>
                        </div>
                        <button
                            className="btn btn-outline-primary"
                            data-bs-toggle="modal"
                            data-bs-target="#editDocModal"
                        >
                            Edit Profile
                        </button>
                    </div>

                    <hr />

                    <div className="row g-4">
                        {/* Contact Info */}
                        <div className="col-md-6">
                            <h6 className="text-uppercase text-muted mb-3">
                                Contact Information
                            </h6>
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

                        {/* Professional Info */}
                        <div className="col-md-6">
                            <h6 className="text-uppercase text-muted mb-3">
                                Professional Details
                            </h6>
                            <p>
                                <strong>Degree:</strong>{" "}
                                {doctor.degree?.join(", ")}
                            </p>
                        </div>

                        {/* Address */}
                        <div className="col-12">
                            <h6 className="text-uppercase text-muted mb-3">
                                Clinic Address
                            </h6>
                            <p className="mb-1">{doctor.address.line1}</p>
                            {doctor.address.line2 && (
                                <p className="mb-1">{doctor.address.line2}</p>
                            )}
                            <p className="mb-0">
                                {doctor.address.city}, {doctor.address.state} –{" "}
                                {doctor.address.pincode}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= EDIT MODAL ================= */}
            <div
                className="modal fade"
                id="editDocModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg modal-dialog-scrollable">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit Doctor Profile</h5>
                            <button
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <form className="px-2">
                                {/* BASIC INFO */}
                                <h6 className="text-uppercase text-muted mb-3">
                                    Basic Information
                                </h6>

                                <div className="row g-3 mb-4">
                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Name
                                        </label>
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
                                        <label className="form-label">
                                            Phone
                                        </label>
                                        <input
                                            className="form-control"
                                            name="phone"
                                            value={editData.phone}
                                            onChange={handleEditChange}
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">
                                            Registration No
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
                                            onClick={() =>
                                                removeDegreeField(index)
                                            }
                                            disabled={
                                                editData.degree.length === 1
                                            }
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
                                    Address
                                </h6>

                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label">
                                            Line 1
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
                                            Line 2
                                        </label>
                                        <input
                                            className="form-control"
                                            name="line2"
                                            value={editData.address.line2}
                                            onChange={handleAddressChange}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">
                                            City
                                        </label>
                                        <input
                                            className="form-control"
                                            name="city"
                                            value={editData.address.city}
                                            onChange={handleAddressChange}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">
                                            State
                                        </label>
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
                            </form>
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
                                onClick={handleSave}
                                data-bs-dismiss="modal"
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
