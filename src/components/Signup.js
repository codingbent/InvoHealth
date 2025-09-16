import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const Signup = (props) => {
    const [credentials, setcredentials] = useState({
        name: "",
        email: "",
        password: "",
        cpassword: "",
        clinicName: "",
        phone: "",
        secondaryPhone: "",
        street: "",
        street2: "",
        street3: "",
        city: "",
        state: "",
        pincode: "",
        gstNumber: "",
        experience: "",
        timings: [], // user types "10:00-12:00" etc.,
        degrees: [""],
    });

    let navigate = useNavigate();

    // Convert slot string "10:00-12:00" to {start, end}
    const formatTimingsForBackend = () => {
        return credentials.timings.map((entry) => ({
            days: entry.days, // now supports multiple days like ["Mon", "Tue"]
            slots: entry.slots
                .filter((slot) => slot.start && slot.end) // only keep valid slots
                .map((slot) => ({
                    start: slot.start,
                    end: slot.end,
                })),
            note: entry.note || "",
        }));
    };

    const handlesubmit = async (e) => {
        e.preventDefault();
        const { name, email, password, cpassword } = credentials;

        if (password !== cpassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }

        const API_BASE_URL =
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001";

        // Prepare body with formatted timings
        const bodyToSend = {
            ...credentials,
            address: {
                line1: credentials.street,
                line2: credentials.street2,
                line3: credentials.street3,
                city: credentials.city,
                state: credentials.state,
                pincode: credentials.pincode,
            },
            timings: formatTimingsForBackend(),
            degree: credentials.degrees.filter((d) => d.trim() !== ""),
        };

        const response = await fetch(`${API_BASE_URL}/api/auth/createdoc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyToSend),
        });

        const json = await response.json();

        if (json.success) {
            localStorage.setItem("token", json.authtoken);
            localStorage.setItem("name", name);
            navigate("/");
            props.showAlert("Successfully Signed up", "success");
        } else {
            props.showAlert(json.error || "Invalid input", "danger");
            console.log(json);
        }
    };

    const onChange = (e) => {
        setcredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleadddegree = () => {
        const divEle = document.getElementById("inputFields");
        const wrapper = document.createElement("div");
        const iFeild = document.createElement("input");
        iFeild.setAttribute("type", "text");
        iFeild.setAttribute("placeholder", "Enter degree");
        iFeild.classList.add("form-control");
        iFeild.setAttribute("name", "degree");
        wrapper.appendChild(iFeild);
        wrapper.classList.add("pt-2");
        divEle.appendChild(wrapper);
        const allDegrees = document.querySelectorAll("input[name='degree']");
        allDegrees.forEach((input) => {
            console.log(input.value);
        });
    };

    const handleDegreeChange = (index, value) => {
        const updated = [...credentials.degrees];
        updated[index] = value;
        setcredentials({ ...credentials, degrees: updated });
    };

    const addDegreeField = () => {
        setcredentials({
            ...credentials,
            degrees: [...credentials.degrees, ""],
        });
    };

    const removeDegreeField = (index) => {
        const updated = [...credentials.degrees];
        updated.splice(index, 1);
        setcredentials({ ...credentials, degrees: updated });
    };

    const toggleDay = (entryIndex, day) => {
        setcredentials((prev) => {
            const updated = [...prev.timings];
            if (updated[entryIndex].days.includes(day)) {
                updated[entryIndex].days = updated[entryIndex].days.filter(
                    (d) => d !== day
                );
            } else {
                updated[entryIndex].days.push(day);
            }
            return { ...prev, timings: updated };
        });
    };

    const addEntry = () => {
        setcredentials((prev) => ({
            ...prev,
            timings: [...prev.timings, { days: [], slots: [], note: "" }],
        }));
    };

    const removeEntry = (entryIndex) => {
        setcredentials((prev) => ({
            ...prev,
            timings: prev.timings.filter((_, i) => i !== entryIndex),
        }));
    };

    const addSlot = (entryIndex) => {
        setcredentials((prev) => {
            const updated = [...prev.timings];
            updated[entryIndex].slots.push("");
            return { ...prev, timings: updated };
        });
    };

    const updateSlot = (entryIndex, slotIndex, value) => {
        setcredentials((prev) => {
            const updated = [...prev.timings];
            updated[entryIndex].slots[slotIndex] = value;
            return { ...prev, timings: updated };
        });
    };

    const removeSlot = (entryIndex, slotIndex) => {
        setcredentials((prev) => {
            const updated = [...prev.timings];
            updated[entryIndex].slots = updated[entryIndex].slots.filter(
                (_, i) => i !== slotIndex
            );
            return { ...prev, timings: updated };
        });
    };

    const updateNote = (entryIndex, value) => {
        setcredentials((prev) => {
            const updated = [...prev.timings];
            updated[entryIndex].note = value;
            return { ...prev, timings: updated };
        });
    };

    return (
        <div className="container mt-3">
            <form onSubmit={handlesubmit}>
                {/* Name */}
                <div className="mb-3">
                    <label className="form-label">Full Name</label>
                    <input
                        type="text"
                        className="form-control"
                        name="name"
                        required
                        onChange={onChange}
                    />
                </div>

                {/* Email */}
                <div className="mb-3">
                    <label className="form-label">Email address</label>
                    <input
                        type="email"
                        className="form-control"
                        name="email"
                        required
                        onChange={onChange}
                    />
                </div>

                {/* Password */}
                <div className="mb-3">
                    <label className="form-label">Password</label>
                    <input
                        type="password"
                        className="form-control"
                        name="password"
                        required
                        onChange={onChange}
                    />
                </div>

                {/* Confirm Password */}
                <div className="mb-3">
                    <label className="form-label">Confirm Password</label>
                    <input
                        type="password"
                        className="form-control"
                        name="cpassword"
                        required
                        onChange={onChange}
                    />
                </div>

                {/* Clinic Name */}
                <div className="mb-3">
                    <label className="form-label">Clinic / Hospital Name</label>
                    <input
                        type="text"
                        className="form-control"
                        name="clinicName"
                        required
                        onChange={onChange}
                    />
                </div>

                {/* Phone Numbers */}
                <div className="mb-3">
                    <label className="form-label">Doctor Contact</label>
                    <input
                        type="text"
                        className="form-control"
                        name="phone"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Appointment Contact</label>
                    <input
                        type="text"
                        className="form-control"
                        name="secondaryPhone"
                        onChange={onChange}
                    />
                </div>

                {/* Address */}
                <h5>Address</h5>
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Address Line 1 (required)"
                    name="street"
                    required
                    onChange={onChange}
                />
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Address Line 2 (optional)"
                    name="street2"
                    onChange={onChange}
                />
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Address Line 3 (optional)"
                    name="street3"
                    onChange={onChange}
                />
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="City"
                    name="city"
                    required
                    onChange={onChange}
                />
                <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="State"
                    name="state"
                    required
                    onChange={onChange}
                />
                <input
                    type="text"
                    className="form-control mb-3"
                    placeholder="Pincode"
                    name="pincode"
                    required
                    onChange={onChange}
                />

                {/* GST */}
                <div className="mb-3">
                    <label className="form-label">GST Number (optional)</label>
                    <input
                        type="text"
                        className="form-control"
                        name="gstNumber"
                        onChange={onChange}
                    />
                </div>

                {/* Experience */}
                <div className="mb-3">
                    <label className="form-label">Experience</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 10 years in Orthopedics"
                        name="experience"
                        onChange={onChange}
                    />
                </div>

                {/* Timings UI */}
                <div className="mb-3">
                    <h5>Doctor Timings</h5>

                    {credentials.timings.map((entry, entryIndex) => (
                        <div
                            key={entryIndex}
                            className="border p-3 mb-2 rounded"
                        >
                            {/* Multi-select days */}
                            <div className="d-flex flex-wrap mb-3">
                                {[
                                    "Mon",
                                    "Tue",
                                    "Wed",
                                    "Thu",
                                    "Fri",
                                    "Sat",
                                    "Sun",
                                ].map((d) => (
                                    <button
                                        type="button"
                                        key={d}
                                        className={`btn btn-sm me-2 mb-2 ${
                                            entry.days.includes(d)
                                                ? "btn-primary"
                                                : "btn-outline-primary"
                                        }`}
                                        onClick={() => toggleDay(entryIndex, d)}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>

                            {/* Slots for this set of days */}
                            {entry.slots.map((slot, slotIndex) => (
                                <div
                                    key={slotIndex}
                                    className="d-flex mb-2 align-items-center"
                                >
                                    <label className="me-2">From:</label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={slot.start || ""}
                                        onChange={(e) =>
                                            updateSlot(entryIndex, slotIndex, {
                                                ...slot,
                                                start: e.target.value,
                                            })
                                        }
                                    />

                                    <label className="ms-3 me-2">To:</label>
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={slot.end || ""}
                                        onChange={(e) =>
                                            updateSlot(entryIndex, slotIndex, {
                                                ...slot,
                                                end: e.target.value,
                                            })
                                        }
                                    />

                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm ms-2"
                                        onClick={() =>
                                            removeSlot(entryIndex, slotIndex)
                                        }
                                    >
                                        X
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => addSlot(entryIndex)}
                            >
                                + Add Slot
                            </button>

                            <input
                                type="text"
                                className="form-control mt-2"
                                placeholder="Optional note (e.g. On Call)"
                                value={entry.note || ""}
                                onChange={(e) =>
                                    updateNote(entryIndex, e.target.value)
                                }
                            />

                            <div className="text-end mt-2">
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => removeEntry(entryIndex)}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add new set of days */}
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={addEntry}
                    >
                        + Add Another Timing Group
                    </button>
                </div>

                <div className="mb-3">
                    <label className="form-label">Degree(s)</label>
                    {credentials.degrees.map((degree, index) => (
                        <div key={index} className="d-flex mb-2">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter degree"
                                value={degree}
                                onChange={(e) =>
                                    handleDegreeChange(index, e.target.value)
                                }
                                required
                            />
                            <button
                                type="button"
                                className="btn btn-danger ms-2"
                                onClick={() => removeDegreeField(index)}
                                disabled={credentials.degrees.length === 1}
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

                <div className="mb-3">
                    <button type="submit" className="btn btn-success">
                        Sign Up
                    </button>
                </div>

                <p className="text">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary">
                        Login
                    </Link>
                </p>
            </form>
        </div>
    );
};

export default Signup;
