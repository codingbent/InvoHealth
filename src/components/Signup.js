import { useState } from "react";
import { useNavigate } from "react-router";
const Signup = (props) => {
    const [credentials, setcredentials] = useState({
        name: "",
        email: "",
        password: "",
        cpassword: "",
        clinicName: "",
        phone: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        gstNumber: "",
    });
    let navigate = useNavigate();
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

        const response = await fetch(`${API_BASE_URL}/api/auth/createdoc`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                email,
                password,
                clinicName: credentials.clinicName,
                phone: credentials.phone,
                address: {
                    street: credentials.street,
                    city: credentials.city,
                    state: credentials.state,
                    pincode: credentials.pincode,
                },
                gstNumber: credentials.gstNumber,
            }),
        });

        const json = await response.json();

        if (json.success) {
            localStorage.setItem("token", json.authtoken);
            localStorage.setItem("name", name);
            navigate("/");
            props.showAlert("Successfully Signed up", "success");
        } else {
            props.showAlert(json.error || "Invalid input", "danger");
        }
    };

    const onChange = (e) => {
        setcredentials({ ...credentials, [e.target.name]: e.target.value });
    };
    return (
        <div className="container mt-5">
            <form onSubmit={handlesubmit}>
                <div className="mb-3">
                    <label
                        htmlFor="exampleFormControlInput1"
                        className="form-label"
                    >
                        Name
                    </label>
                    <input
                        type="text"
                        className="form-control"
                        id="exampleFormControlInput1"
                        placeholder="Full Name"
                        name="name"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label
                        htmlFor="exampleFormControlInput2"
                        className="form-label"
                    >
                        Email address
                    </label>
                    <input
                        type="email"
                        className="form-control"
                        id="exampleFormControlInput2"
                        placeholder="name@example.com"
                        name="email"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="inputPassword5" className="form-label">
                        Password
                    </label>
                    <input
                        type="password"
                        id="inputPassword5"
                        className="form-control"
                        aria-describedby="passwordHelpBlock"
                        name="password"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="inputPassword" className="form-label">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="inputPassword"
                        className="form-control"
                        aria-describedby="passwordHelpBlock"
                        name="cpassword"
                        required
                        onChange={onChange}
                    />
                </div>
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

                <div className="mb-3">
                    <label className="form-label">Phone</label>
                    <input
                        type="text"
                        className="form-control"
                        name="phone"
                        required
                        onChange={onChange}
                    />
                </div>

                <h5>Address</h5>
                <div className="mb-3">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Street"
                        name="street"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="City"
                        name="city"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="State"
                        name="state"
                        required
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Pincode"
                        name="pincode"
                        required
                        onChange={onChange}
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label">GST Number (optional)</label>
                    <input
                        type="text"
                        className="form-control"
                        name="gstNumber"
                        onChange={onChange}
                    />
                </div>
                <div className="mb-3">
                    <button type="submit" className="btn btn-primary">
                        Sign Up
                    </button>
                </div>
            </form>
        </div>
    );
};
export default Signup;
