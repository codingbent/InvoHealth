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
        regNumber: "",
        experience: "",
        degrees: [""],
    });
    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    let navigate = useNavigate();

    const handlesubmit = async (e) => {
        e.preventDefault();
        const { name, email, password, cpassword } = credentials;

        if (password !== cpassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }

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

    // const handleadddegree = () => {
    //     const divEle = document.getElementById("inputFields");
    //     const wrapper = document.createElement("div");
    //     const iFeild = document.createElement("input");
    //     iFeild.setAttribute("type", "text");
    //     iFeild.setAttribute("placeholder", "Enter degree");
    //     iFeild.classList.add("form-control");
    //     iFeild.setAttribute("name", "degree");
    //     wrapper.appendChild(iFeild);
    //     wrapper.classList.add("pt-2");
    //     divEle.appendChild(wrapper);
    //     const allDegrees = document.querySelectorAll("input[name='degree']");
    //     allDegrees.forEach((input) => {
    //         console.log(input.value);
    //     });
    // };

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
                    <label className="form-label">
                        Registration Number (optional)
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        name="regNumber"
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
