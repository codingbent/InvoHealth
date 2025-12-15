import { useEffect, useState } from "react";
import { Modal } from "bootstrap";

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

                // ✅ close modal ONLY on success
                const modalEl = document.getElementById("editDocModal");
                const modal = Modal.getInstance(modalEl);
                modal?.hide();
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
            <h2 className="mb-3">Doctor Profile</h2>

            <div className="card p-3 shadow">
                <h4>{doctor.name}</h4>
                <p>
                    <strong>Clinic:</strong> {doctor.clinicName}
                </p>
                <p>
                    <strong>Email:</strong> {doctor.email}
                </p>
                <p>
                    <strong>Phone:</strong> {doctor.phone}
                </p>
                <p>
                    <strong>Reg No:</strong> {doctor.regNumber || "N/A"}
                </p>
                <p>
                    <strong>Degree:</strong> {doctor.degree?.join(", ")}
                </p>

                <h5 className="mt-3">Address</h5>
                <p>{doctor.address.line1}</p>
                {doctor.address.line2 && <p>{doctor.address.line2}</p>}
                <p>
                    {doctor.address.city}, {doctor.address.state},{" "}
                    {doctor.address.pincode}
                </p>

                {/* Edit Button */}
                <button
                    className="btn btn-primary mt-3"
                    data-bs-toggle="modal"
                    data-bs-target="#editDocModal"
                >
                    Edit Profile
                </button>
            </div>

            {/* ------------------ EDIT MODAL ------------------ */}
            <div
                className="modal fade"
                id="editDocModal"
                tabIndex="-1"
                aria-hidden="true"
            >
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Edit Doctor Profile</h5>
                            <button
                                className="btn-close"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body">
                            <form>
                                {/* Name */}
                                <div className="mb-3">
                                    <label className="form-label">Name</label>
                                    <input
                                        className="form-control"
                                        name="name"
                                        value={editData.name}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                {/* Clinic */}
                                <div className="mb-3">
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

                                {/* Phone */}
                                <div className="mb-3">
                                    <label className="form-label">Phone</label>
                                    <input
                                        className="form-control"
                                        name="phone"
                                        value={editData.phone}
                                        onChange={handleEditChange}
                                    />
                                </div>

                                {/* Reg Number */}
                                <div className="mb-3">
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

                                {/* Degree */}
                                <div className="mb-3">
                                    <label className="form-label">
                                        Degree(s)
                                    </label>

                                    {editData.degree.map((deg, index) => (
                                        <div
                                            key={index}
                                            className="d-flex mb-2"
                                        >
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
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-danger ms-2"
                                                onClick={() =>
                                                    removeDegreeField(index)
                                                }
                                                disabled={
                                                    editData.degree.length === 1
                                                }
                                            >
                                                X
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        className="btn btn-primary mt-2"
                                        onClick={addDegreeField}
                                    >
                                        + Add Degree
                                    </button>
                                </div>

                                {/* Address */}
                                <h5>Address</h5>
                                <div className="mb-3">
                                    <label className="form-label">Line 1</label>
                                    <input
                                        className="form-control"
                                        name="line1"
                                        value={editData.address.line1}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Line 2</label>
                                    <input
                                        className="form-control"
                                        name="line2"
                                        value={editData.address.line2}
                                        onChange={handleAddressChange}
                                    />
                                </div>
                                <div className="row">
                                    <div className="col-4 mb-3">
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
                                    <div className="col-4 mb-3">
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
                                    <div className="col-4 mb-3">
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
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                            >
                                Close
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
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
