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
        degree: "",
    });

    let navigate = useNavigate();

    // Handle timing add/remove/update
    const addDay = () => {
        setcredentials({
            ...credentials,
            timings: [...credentials.timings, { day: "", slots: [""] }],
        });
    };

    const updateDay = (index, value) => {
        const updated = [...credentials.timings];
        updated[index].day = value;
        setcredentials({ ...credentials, timings: updated });
    };

    const updateSlot = (dayIndex, slotIndex, value) => {
        const updated = [...credentials.timings];
        updated[dayIndex].slots[slotIndex] = value;
        setcredentials({ ...credentials, timings: updated });
    };

    const addSlot = (dayIndex) => {
        const updated = [...credentials.timings];
        updated[dayIndex].slots.push("");
        setcredentials({ ...credentials, timings: updated });
    };

    const removeDay = (index) => {
        const updated = [...credentials.timings];
        updated.splice(index, 1);
        setcredentials({ ...credentials, timings: updated });
    };

    const removeSlot = (dayIndex, slotIndex) => {
        const updated = [...credentials.timings];
        updated[dayIndex].slots.splice(slotIndex, 1);
        setcredentials({ ...credentials, timings: updated });
    };

    const updateNote = (dayIndex, value) => {
        const updated = [...credentials.timings];
        updated[dayIndex].note = value;
        setcredentials({ ...credentials, timings: updated });
    };

    // Convert slot string "10:00-12:00" to {start, end}
    const formatTimingsForBackend = () => {
        return credentials.timings.map((day) => ({
            day: day.day,
            slots: day.slots
                .filter(Boolean) // ignore empty strings
                .map((slot) => {
                    const [start, end] = slot.split("-").map((s) => s.trim());
                    return { start, end };
                }),
            note: day.note || "",
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
            degree: credentials.degree.split(",").map((d) => d.trim()),
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

    const handleadddegree=()=>{
        const divEle = document.getElementById("inputFields");
            const wrapper = document.createElement("div");
            const iFeild = document.createElement("input");
            iFeild.setAttribute("type", "text");
            iFeild.setAttribute("placeholder", "Enter degree");
            iFeild.classList.add("form-control");
            iFeild.setAttribute("name","degree")
            wrapper.appendChild(iFeild);
            divEle.appendChild(wrapper);
    }

    

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
                    <label className="form-label">Primary Phone</label>
                    <input
                        type="text"
                        className="form-control"
                        name="phone"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Secondary Phone</label>
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
                    {credentials.timings.map((day, dayIndex) => (
                        <div key={dayIndex} className="border p-3 mb-2 rounded">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Day (e.g. Monday)"
                                    value={day.day}
                                    onChange={(e) =>
                                        updateDay(dayIndex, e.target.value)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm ms-2"
                                    onClick={() => removeDay(dayIndex)}
                                >
                                    Remove Day
                                </button>
                            </div>

                            {day.slots.map((slot, slotIndex) => (
                                <div
                                    key={slotIndex}
                                    className="d-flex mb-2 align-items-center"
                                >
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Slot (e.g. 10:00-12:00)"
                                        value={slot}
                                        onChange={(e) =>
                                            updateSlot(
                                                dayIndex,
                                                slotIndex,
                                                e.target.value
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm ms-2"
                                        onClick={() =>
                                            removeSlot(dayIndex, slotIndex)
                                        }
                                    >
                                        X
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => addSlot(dayIndex)}
                            >
                                Add Slot
                            </button>

                            <input
                                type="text"
                                className="form-control mt-2"
                                placeholder="Optional note (e.g. On Call)"
                                value={day.note || ""}
                                onChange={(e) =>
                                    updateNote(dayIndex, e.target.value)
                                }
                            />
                        </div>
                    ))}

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={addDay}
                    >
                        + Add Day
                    </button>
                </div>

                <div className="mb-3">
                    <label className="form-label" htmlFor="degree">
                        Degree(s)
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="degree"
                        name="degree"
                        placeholder="Enter degrees, comma separated"
                        value={credentials.degree || ""}
                        onChange={(e) =>
                            setcredentials({
                                ...credentials,
                                degree: e.target.value, // store as string directly
                            })
                        }
                        required
                    />
                    <div id="inputFields"></div>
                    <button type="button" className="btn btn-primary" onClick={handleadddegree}>Add Degree</button>
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
