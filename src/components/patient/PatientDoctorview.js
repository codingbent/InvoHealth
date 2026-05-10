import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, Mail, ArrowLeft, Phone, Stethoscope } from "lucide-react";
import { API_BASE_URL } from "../config";
import { usePatient } from "../../context/PatientContext";
import generateInvoicePDF from "../utils/generateInvoice";
import "../../css/patient/PatientDoctorView.css";

const getLocaleFromCountry = (countryCode) =>
    countryCode ? `en-${countryCode}` : undefined;

const PatientDoctorView = ({ showAlert }) => {
    const { doctorId } = useParams();
    const navigate = useNavigate();
    const { patient } = usePatient();
    const [visits, setVisits] = useState([]);
    const [doctor, setDoctor] = useState(null);
    const [tab, setTab] = useState("history");
    const [loading, setLoading] = useState(true);
    const locale = useMemo(() => {
        const code = patient?.countryCode || doctor?.address?.countryCode;
        return getLocaleFromCountry(code);
    }, [patient, doctor]);

    const fmt = (v) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(v);

    // FETCH DOCTOR
    useEffect(() => {
        const fetchDoctor = async () => {
            const token = localStorage.getItem("patient_token");
            const res = await fetch(
                `${API_BASE_URL}/api/patient/doctor/${doctorId}`,
                {
                    headers: { "auth-token": token },
                },
            );
            const data = await res.json();
            if (data.success) setDoctor(data.doctor);
        };
        fetchDoctor();
    }, [doctorId]);

    // useEffect(() => {
    //     if (!doctorId) return;

    //     const fetchAvailability = async () => {
    //         try {
    //             const token = localStorage.getItem("patient_token");

    //             const res = await fetch(
    //                 `${API_BASE_URL}/api/patient/doctor/${doctorId}/availability`,
    //                 {
    //                     headers: { "auth-token": token },
    //                 },
    //             );

    //             const data = await res.json();

    //             if (data.success) {
    //                 setAvailability(data.availability || []);
    //             }
    //         } catch (err) {
    //             console.error("Availability error:", err);
    //         }
    //     };

    //     fetchAvailability();
    // }, [doctorId]);

    const currencySymbol = doctor?.address?.currencySymbol || "";

    const countryCode = useMemo(() => {
        if (!doctor) return "";

        if (doctor.address?.dialCode) {
            return doctor.address.dialCode;
        }

        // if (countries.length) {
        //     const match = countries.find(
        //         (c) =>
        //             c._id === doctor.country ||
        //             c._id === doctor.country?._id ||
        //             c.name === doctor.country,
        //     );

        //     if (match?.dialCode) return match.dialCode;
        // }

        return "";
    }, [doctor]);

    // FETCH VISITS
    useEffect(() => {
        const fetchVisits = async () => {
            const token = localStorage.getItem("patient_token");
            const res = await fetch(
                `${API_BASE_URL}/api/patient/visits/${doctorId}`,
                {
                    headers: { "auth-token": token },
                },
            );
            const data = await res.json();
            if (data.success) setVisits(data.visits || []);
            setLoading(false);
        };
        fetchVisits();
    }, [doctorId]);

    const { upcoming, history } = useMemo(() => {
        const now = new Date();

        return {
            upcoming: visits.filter((v) => new Date(v.date) >= now),
            history: visits.filter((v) => new Date(v.date) < now),
        };
    }, [visits]);

    const displayed = tab === "upcoming" ? upcoming : history;

    const sendMail = async (visitId) => {
        const token = localStorage.getItem("patient_token");

        showAlert("Email will be sent shortly...", "info");

        try {
            const res = await fetch(
                `${API_BASE_URL}/api/patient/send-invoice`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "auth-token": token,
                    },
                    body: JSON.stringify({ visitId }),
                },
            );

            const data = await res.json();

            if (data.success) {
                showAlert(
                    <>
                        Invoice sent successfully{" "}
                        <Mail size={16} style={{ marginLeft: 4 }} />
                    </>,
                    "success",
                );
            } else {
                showAlert(data.error || "Failed to send invoice", "danger");
            }
        } catch (err) {
            console.error(err);
            showAlert("Failed to send email. Try again.", "danger");
        }
    };

    if (loading) return <div className="pdv-loading">Loading...</div>;

    return (
        <div className="pdv-page">
            <div className="pdv-inner">
                {/* BACK */}
                <button
                    className="pdv-back-btn"
                    onClick={() => navigate("/patient")}
                >
                    <ArrowLeft size={14} /> Back
                </button>

                {/* DOCTOR */}
                {doctor && (
                    <div className="pdv-doctor-card">
                        <div className="pdv-doc-header">
                            <div className="pdv-doc-avatar">
                                {doctor.name?.[0]}
                            </div>
                            <div>
                                <div className="pdv-doc-name">
                                    {doctor.name}
                                </div>
                                <div className="pdv-doc-spec">
                                    <Stethoscope size={13} />
                                    {(doctor.specialization || []).join(", ")}
                                </div>
                            </div>
                        </div>

                        <div className="pdv-doc-grid">
                            <div>
                                <span>Clinic</span>
                                <p>{doctor.clinicName}</p>
                            </div>

                            <div>
                                <span>Phone</span>
                                <a
                                    href={`tel:${countryCode}${doctor.phone}`}
                                    className="pdv-phone-link"
                                >
                                    <Phone size={13} />
                                    {countryCode} {doctor.phone}
                                </a>
                            </div>
                            <div>
                                <span>Appointment</span>
                                <a
                                    href={`tel:${countryCode}${doctor.phone}`}
                                    className="pdv-phone-link"
                                >
                                    <Phone size={13} />
                                    {countryCode} {doctor.appointment}
                                </a>
                            </div>

                            <div>
                                <span>Address</span>
                                <p>{doctor.address?.city}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATS */}
                <div className="pdv-pills">
                    <div className="pdv-pill">
                        <div>{visits.length}</div>
                        <span>Total</span>
                    </div>
                    <div className="pdv-pill">
                        <div>{upcoming.length}</div>
                        <span>Upcoming</span>
                    </div>
                    <div className="pdv-pill">
                        <div>{history.length}</div>
                        <span>Past</span>
                    </div>
                </div>

                {/* TABS */}
                <div className="pdv-tabs">
                    <button
                        className={tab === "history" ? "active" : ""}
                        onClick={() => setTab("history")}
                    >
                        History
                    </button>
                    <button
                        className={tab === "upcoming" ? "active" : ""}
                        onClick={() => setTab("upcoming")}
                    >
                        Upcoming
                    </button>
                </div>

                {/* DESKTOP TABLE */}
                <div className="pdv-table-wrap">
                    <table className="pdv-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Service</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {displayed.map((v) => (
                                <tr key={v._id}>
                                    <td>
                                        {new Date(v.date).toLocaleDateString(
                                            locale,
                                            {
                                                day: "numeric",
                                                month: "long",
                                                year: "numeric",
                                            },
                                        )}
                                    </td>
                                    <td>
                                        {(v.service || [])
                                            .map((s) => s.name)
                                            .join(", ")}
                                    </td>
                                    <td>
                                        {v.collected !== v.amount && (
                                            <span
                                                style={{
                                                    color: "#bd2121",
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {currencySymbol}
                                                {fmt(v.collected ?? 0)}{" "}
                                                <span
                                                    style={{
                                                        color: "white",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    of
                                                </span>
                                            </span>
                                        )}{" "}
                                        <span style={{ color: "#22c55e" }}>
                                            {currencySymbol}
                                            {fmt(v.amount ?? 0)}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`status ${v.status?.toLowerCase()}`}
                                        >
                                            {v.status}
                                        </span>
                                    </td>
                                    <td className="pdv-actions">
                                        <button
                                            onClick={() =>
                                                generateInvoicePDF(
                                                    v,
                                                    true,
                                                    doctor,
                                                    patient,
                                                    showAlert,
                                                )
                                            }
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button onClick={() => sendMail(v._id)}>
                                            <Mail size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* MOBILE CARDS */}
                {displayed.map((v) => (
                    <div key={v._id} className="pdv-card">
                        <div className="pdv-card-top">
                            <span>
                                {new Date(v.date).toLocaleDateString(locale, {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </span>
                            <span
                                className={`status ${v.status?.toLowerCase()}`}
                            >
                                {v.status}
                            </span>
                        </div>

                        <div className="pdv-card-service">
                            {(v.service || []).map((s) => s.name).join(", ")}
                        </div>

                        <div className="pdv-card-bottom">
                            <span>
                                {currencySymbol}
                                {fmt(v.amount)}
                            </span>
                            <div className="actions">
                                <button
                                    onClick={() =>
                                        generateInvoicePDF(
                                            v,
                                            true,
                                            doctor,
                                            patient,
                                            showAlert,
                                        )
                                    }
                                >
                                    <Download size={14} />
                                </button>
                                <button onClick={() => sendMail(v._id)}>
                                    <Mail size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* EMPTY */}
                {displayed.length === 0 && (
                    <div className="pdv-empty">No data</div>
                )}
            </div>
        </div>
    );
};

export default PatientDoctorView;
