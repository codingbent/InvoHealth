import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, LogIn, AlertCircle } from "lucide-react";

const AdminLogin = () => {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const API_BASE_URL =
        process.env.NODE_ENV === "production"
            ? "https://gmsc-backend.onrender.com"
            : "http://localhost:5001";

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/admin/login_admin`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                },
            );
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || "Login failed");
                return;
            }
            localStorage.setItem("role", data.role);
            localStorage.setItem("admintoken", data.admintoken);
            navigate("/admin/fetchall_doctors");
        } catch (err) {
            setError("Server error");
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');
                .al-root {
                    font-family: 'DM Mono', monospace;
                    min-height: 100vh;
                    background: #0a0d14;
                    display: flex; align-items: center; justify-content: center;
                    padding: 40px 16px;
                    position: relative;
                }
                .al-root::before {
                    content: '';
                    position: fixed; top: -180px; left: 50%; transform: translateX(-50%);
                    width: 560px; height: 400px;
                    background: radial-gradient(ellipse, rgba(77,124,246,0.07) 0%, transparent 65%);
                    pointer-events: none;
                }
                .al-card {
                    width: 100%; max-width: 380px;
                    background: #0d1117; border: 1px solid #161d2e;
                    border-radius: 20px; padding: 40px 36px 36px;
                    position: relative; z-index: 1;
                    box-shadow: 0 32px 80px rgba(0,0,0,0.5);
                    animation: al-rise 0.45s cubic-bezier(0.22,1,0.36,1) both;
                }
                @keyframes al-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
                .al-card::before {
                    content: ''; position: absolute;
                    top: 0; left: 10%; right: 10%;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(251,146,60,0.4), transparent);
                }
                .al-header { text-align: center; margin-bottom: 30px; }
                .al-icon {
                    width: 48px; height: 48px;
                    background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.2);
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    color: #fb923c; margin: 0 auto 16px;
                }
                .al-title {
                    font-family: 'Instrument Serif', serif;
                    font-size: 24px; font-weight: 400;
                    color: #e8edf8; margin-bottom: 4px;
                }
                .al-title em { font-style: italic; color: #fb923c; }
                .al-subtitle { font-size: 10px; color: #2e3d5c; letter-spacing: 0.08em; }
                .al-error {
                    display: flex; align-items: center; gap: 8px;
                    padding: 10px 14px; margin-bottom: 16px;
                    background: rgba(248,113,113,0.08); border: 1px solid rgba(248,113,113,0.2);
                    border-radius: 8px; font-size: 11px; color: #f87171; letter-spacing: 0.03em;
                }
                .al-field { margin-bottom: 14px; }
                .al-label { display: block; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: #2e3d5c; margin-bottom: 7px; }
                .al-input {
                    width: 100%;
                    background: #080c18; border: 1px solid #1a2540;
                    border-radius: 8px; padding: 10px 14px;
                    font-family: 'DM Mono', monospace; font-size: 12px; color: #c5d0e8;
                    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .al-input::placeholder { color: #252e45; }
                .al-input:focus { border-color: rgba(251,146,60,0.4); box-shadow: 0 0 0 3px rgba(251,146,60,0.08); }
                .al-btn {
                    width: 100%;
                    display: flex; align-items: center; justify-content: center; gap: 7px;
                    padding: 12px; margin-top: 8px;
                    background: #fb923c; color: #0a0d14; border: none;
                    border-radius: 9px;
                    font-family: 'DM Mono', monospace;
                    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
                    cursor: pointer; transition: all 0.2s;
                    box-shadow: 0 4px 16px rgba(251,146,60,0.3);
                }
                .al-btn:hover { background: #fda55a; box-shadow: 0 6px 22px rgba(251,146,60,0.4); transform: translateY(-1px); }
            `}</style>

            <div className="al-root">
                <div className="al-card">
                    <div className="al-header">
                        <div className="al-icon">
                            <ShieldCheck size={22} />
                        </div>
                        <h1 className="al-title">
                            Admin <em>Portal</em>
                        </h1>
                        <div className="al-subtitle">
                            InvoHealth · Superadmin Access
                        </div>
                    </div>

                    {error && (
                        <div className="al-error">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="al-field">
                            <label className="al-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="al-input"
                                placeholder="admin@invohealth.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="al-field">
                            <label className="al-label">Password</label>
                            <input
                                type="password"
                                name="password"
                                className="al-input"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <button type="submit" className="al-btn">
                            <LogIn size={14} /> Sign In
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AdminLogin;
