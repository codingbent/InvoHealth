import { useState } from "react";
import { useNavigate } from "react-router-dom";
export default function Login(props) {
    let navigate = useNavigate();
    const [details, setDetails] = useState(null);
    const handlesubmit = async (e) => {
        e.preventDefault();

        const API_BASE_URL =
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001";

        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "auth-token": localStorage.getItem("token"),
            },
            body: JSON.stringify({
                email: details.email,
                password: details.password,
            }),
        });
        const json = await response.json();
        //console.log(json);

        if (json.success) {
            localStorage.setItem("token", json.authtoken);
            localStorage.setItem("name", json.name);
            navigate("/");
            props.showAlert("Successfully logged in", "success");
        } else {
            props.showAlert("Enter correct credentials", "danger");
        }
    };

    const onChange = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };
    return (
        <div className="container mt-5">
            <form onSubmit={handlesubmit}>
                <div className="mb-3">
                    <label htmlFor="exampleInputEmail1" className="form-label">
                        Email address
                    </label>
                    <input
                        type="email"
                        className="form-control"
                        name="email"
                        id="exampleInputEmail1"
                        aria-describedby="emailHelp"
                        onChange={onChange}
                        required
                    />
                    <div id="emailHelp" className="form-text">
                        We'll never share your email with anyone else.
                    </div>
                </div>
                <div className="mb-3">
                    <label
                        htmlFor="exampleInputPassword1"
                        className="form-label"
                    >
                        Password
                    </label>
                    <input
                        type="password"
                        className="form-control"
                        name="password"
                        id="exampleInputPassword1"
                        onChange={onChange}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">
                    Login
                </button>
            </form>
        </div>
    );
}
