import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authFetch } from "./authfetch";
import { ShieldCheck, UserPlus } from "lucide-react";

const normalizePhone = (phone) => phone.replace(/\D/g, "").slice(-10);
const isValidIndianMobile = (phone) => /^[6-9]\d{9}$/.test(phone);

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

    const [otp, setOtp] = useState("");
    const [sessionId, setSessionId] = useState("");
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);
    const normalizedPhone = useMemo(
        () => normalizePhone(credentials.phone),
        [credentials.phone],
    );

    useEffect(() => {
        setSessionId("");
        setOtp("");
        setPhoneVerified(false);
        setOtpCooldown(0);
    }, [normalizedPhone]);

    const API_BASE_URL = useMemo(
        () =>
            process.env.NODE_ENV === "production"
                ? "https://gmsc-backend.onrender.com"
                : "http://localhost:5001",
        [],
    );

    const navigate = useNavigate();

    const handlesubmit = async (e) => {
        e.preventDefault();

        if (!phoneVerified) {
            props.showAlert("Please verify phone number first", "danger");
            return;
        }

        if (credentials.password !== credentials.cpassword) {
            props.showAlert("Passwords do not match", "danger");
            return;
        }

        const bodyToSend = {
            name: credentials.name,
            email: credentials.email,
            password: credentials.password,
            clinicName: credentials.clinicName,

            phone: normalizePhone(credentials.phone),
            appointmentPhone: credentials.secondaryPhone
                ? normalizePhone(credentials.secondaryPhone)
                : "",

            address: {
                line1: credentials.street,
                line2: credentials.street2,
                line3: credentials.street3,
                city: credentials.city,
                state: credentials.state,
                pincode: credentials.pincode,
            },

            regNumber: credentials.regNumber,
            experience: credentials.experience,
            degree: credentials.degrees.filter((d) => d.trim() !== ""),
            role: "doctor",
        };

        const response = await authFetch(`${API_BASE_URL}/api/doctor/create_doctor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyToSend),
        });

        const json = await response.json();

        if (json.success) {
            localStorage.setItem("token", json.authtoken);
            localStorage.setItem("name", credentials.name);
            navigate("/");
            props.showAlert("Successfully Signed up", "success");
        } else {
            props.showAlert(json.error || "Invalid input", "danger");
        }
    };

    const onChange = (e) => {
        setcredentials({ ...credentials, [e.target.name]: e.target.value });
    };
    useEffect(() => {
        if (otpCooldown <= 0) return;

        const timer = setTimeout(() => {
            setOtpCooldown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [otpCooldown]);

    const sendOTP = async () => {
        if (otpCooldown > 0) return;

        const phone = normalizePhone(credentials.phone);

        if (!isValidIndianMobile(phone)) {
            props.showAlert("Enter a valid Indian mobile number", "danger");
            return;
        }

        try {
            setSendingOtp(true);

            // STEP 1: Check if phone exists
            const checkRes = await authFetch(
                `${API_BASE_URL}/api/doctor/check-phone`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone }),
                },
            );

            const checkData = await checkRes.json();

            if (!checkData.success) {
                setSendingOtp(false);
                alert(checkData.error);
                return;
            }

            // STEP 2: Send OTP
            const res = await authFetch(`${API_BASE_URL}/api/authentication/send-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });

            const data = await res.json();
            setSendingOtp(false);

            if (data.success) {
                setSessionId(data.sessionId);
                setOtpCooldown(60);
                props.showAlert("OTP sent successfully", "success");
            } else {
                props.showAlert(data.error || "Unable to send OTP", "danger");
            }
        } catch (err) {
            setSendingOtp(false);
            props.showAlert("Network error. Try again.", "danger");
        }
    };

    const verifyNumber = async () => {
        if (otp.length !== 6) {
            props.showAlert("Enter valid 6-digit OTP", "danger");
            return;
        }

        const res = await authFetch(`${API_BASE_URL}/api/authentication/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: normalizePhone(credentials.phone),
                otp,
                sessionId,
            }),
        });

        const data = await res.json();

        if (data.success) {
            setPhoneVerified(true);
            props.showAlert("Phone number verified", "success");
        } else {
            props.showAlert(data.error || "Invalid OTP", "danger");
        }
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

    return (
        <div className="container d-flex justify-content-center align-items-center my-5">
            <div
                className="card shadow-sm border-0 rounded-4 w-100"
                style={{ maxWidth: "720px" }}
            >
                <div className="card-body p-4 p-md-5">
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h3 className="fw-semibold mb-1">
                            Create Your Account
                        </h3>
                        <p className="text-theme-secondary">
                            Set up your clinic profile to get started
                        </p>
                    </div>

                    <form onSubmit={handlesubmit}>
                        {/* ================= ACCOUNT INFO ================= */}
                        <h5 className="mb-3">Account Information</h5>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Full Name
                                    <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    name="name"
                                    required
                                    onChange={onChange}
                                />
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Email Address
                                    <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="email"
                                    className="form-control"
                                    name="email"
                                    required
                                    onChange={onChange}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Password
                                    <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="password"
                                    required
                                    onChange={onChange}
                                />
                            </div>

                            <div className="col-md-6 mb-3">
                                <label className="form-label">
                                    Confirm Password
                                    <span className="text-danger">*</span>
                                </label>
                                <input
                                    type="password"
                                    className="form-control"
                                    name="cpassword"
                                    required
                                    onChange={onChange}
                                />
                            </div>
                        </div>

                        {/* ================= CLINIC INFO ================= */}
                        <h5 className="mt-4 mb-3">Clinic Information</h5>

                        <div className="mb-3">
                            <label className="form-label">
                                Clinic / Hospital Name
                                <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                name="clinicName"
                                required
                                onChange={onChange}
                            />
                        </div>

                        {/* ================= PHONE VERIFICATION ================= */}
                        <h5 className="mt-4 mb-3">Contact Verification</h5>

                        <div className="mb-3">
                            <label className="form-label">
                                Doctor Contact
                                <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                name="phone"
                                value={credentials.phone}
                                onChange={onChange}
                                disabled={phoneVerified}
                                placeholder="Enter 10-digit phone number"
                            />

                            {!phoneVerified && (
                                <div className="mt-2">
                                    {!sessionId ? (
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary"
                                            onClick={sendOTP}
                                            disabled={
                                                sendingOtp || otpCooldown > 0
                                            }
                                        >
                                            {sendingOtp
                                                ? "Sending OTP..."
                                                : otpCooldown > 0
                                                  ? `Resend OTP in ${otpCooldown}s`
                                                  : "Send OTP"}
                                        </button>
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                className="form-control mt-3 text-center fs-5"
                                                placeholder="Enter OTP"
                                                value={otp}
                                                onChange={(e) =>
                                                    setOtp(
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            "",
                                                        ),
                                                    )
                                                }
                                                maxLength={6}
                                                autoFocus
                                            />

                                            <button
                                                className="btn btn-outline-primary mt-2"
                                                type="button"
                                                onClick={verifyNumber}
                                                disabled={otp.length !== 6}
                                            >
                                                Verify OTP
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {phoneVerified && (
                                <div className="text-success fw-semibold mt-2">
                                 Phone number verified
                                </div>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Appointment Contact
                                <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                name="secondaryPhone"
                                onChange={onChange}
                            />
                        </div>

                        {/* ================= ADDRESS ================= */}
                        <h5 className="mt-4 mb-3">
                            Clinic Address<span className="text-danger">*</span>
                        </h5>

                        <input
                            className="form-control mb-2"
                            placeholder="Address Line 1"
                            name="street"
                            required
                            onChange={onChange}
                        />
                        <input
                            className="form-control mb-2"
                            placeholder="Address Line 2"
                            name="street2"
                            onChange={onChange}
                        />
                        <input
                            className="form-control mb-2"
                            placeholder="Address Line 3"
                            name="street3"
                            onChange={onChange}
                        />
                        <div className="row">
                            <div className="col-md-6 mb-2">
                                <input
                                    className="form-control"
                                    placeholder="City"
                                    name="city"
                                    required
                                    onChange={onChange}
                                />
                            </div>
                            <div className="col-md-6 mb-2">
                                <input
                                    className="form-control"
                                    placeholder="State"
                                    name="state"
                                    required
                                    onChange={onChange}
                                />
                            </div>
                        </div>
                        <input
                            className="form-control mb-3"
                            placeholder="Pincode"
                            name="pincode"
                            required
                            onChange={onChange}
                        />

                        {/* ================= PROFESSIONAL ================= */}
                        <h5 className="mt-4 mb-3">Professional Details</h5>

                        <div className="mb-3">
                            <label className="form-label">
                                Experience<span className="text-danger">*</span>
                            </label>
                            <input
                                className="form-control"
                                name="experience"
                                onChange={onChange}
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">
                                Degree(s)<span className="text-danger">*</span>
                            </label>

                            {credentials.degrees.map((degree, index) => (
                                <div key={index} className="d-flex mb-2">
                                    <input
                                        className="form-control"
                                        value={degree}
                                        onChange={(e) =>
                                            handleDegreeChange(
                                                index,
                                                e.target.value,
                                            )
                                        }
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger ms-2"
                                        onClick={() => removeDegreeField(index)}
                                        disabled={
                                            credentials.degrees.length === 1
                                        }
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                className="btn btn-outline-primary mt-2"
                                onClick={addDegreeField}
                            >
                                + Add Degree
                            </button>
                        </div>
                        {!phoneVerified && (
                            <div className="alert alert-warning text-center mt-3">
                                <ShieldCheck size={18}/>
                                Verify phone number to create account
                            </div>
                        )}
                        {/* ================= SUBMIT ================= */}
                        <button
                            type="submit"
                            className="btn btn-success w-100 mt-3"
                            disabled={!phoneVerified}
                        >
                            <UserPlus size={18}/>
                            <span className="ms-2">Create Account</span>
                        </button>

                        <p className="text-center mt-4 mb-0">
                            Already have an account?{" "}
                            <Link to="/login" className="text-decoration-none">
                                Login
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Signup;
