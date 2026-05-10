import { useState } from "react";
import { Edit2, Eye, EyeOff } from "lucide-react";
import { usePatient } from "../../context/PatientContext";
import EditProfileModal from "./EditPatient";
import "../../css/patient/PatientProfile.css";

const PatientProfile = () => {
    const { patient, loading, updatePatient } = usePatient();
    const [showModal, setShowModal] = useState(false);
    const [showNumber, setShowNumber] = useState(false);

    if (loading) {
        return (
            <div className="pp-page">
                <div className="pp-skeleton">
                    <div
                        className="pp-sk-block"
                        style={{
                            width: 52,
                            height: 52,
                            borderRadius: 13,
                            marginBottom: 12,
                        }}
                    />
                    <div
                        className="pp-sk-block"
                        style={{ width: 200, height: 20, marginBottom: 8 }}
                    />
                    <div
                        className="pp-sk-block"
                        style={{ width: 140, height: 14 }}
                    />
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="pp-page">
                <div className="pp-error">
                    <p>Could not load profile. Please try refreshing.</p>
                </div>
            </div>
        );
    }

    const initials = patient.name
        ? patient.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "P";

    return (
        <div className="pp-page">
            <div className="pp-card">
                {/* Header */}
                <div className="pp-header">
                    <div className="pp-profile-row">
                        <div className="pp-avatar">{initials}</div>
                        <div>
                            <h2 className="pp-name">{patient.name}</h2>
                            <div className="pp-email">
                                {patient.email || "No email on file"}
                            </div>
                            {patient.gender && (
                                <span className="pp-badge">
                                    {patient.gender}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        className="pp-edit-btn"
                        onClick={() => setShowModal(true)}
                    >
                        <Edit2 size={13} /> Edit Profile
                    </button>
                </div>

                {/* Body */}
                <div className="pp-body">
                    <section>
                        <div className="pp-section-label">Contact</div>
                        <ProfileRow
                            label="Email"
                            value={patient.email || "—"}
                        />

                        <div className="pp-row">
                            <span className="pp-row-label">Phone</span>

                            <span className="pp-row-value pp-phone">
                                {patient.number || patient.numberMasked ? (
                                    <>
                                        {patient.dialCode || ""}{" "}
                                        {showNumber
                                            ? patient.number ||
                                              patient.numberMasked
                                            : patient.numberMasked ||
                                              patient.number}
                                        <button
                                            className="pp-eye-btn"
                                            onClick={() =>
                                                setShowNumber((p) => !p)
                                            }
                                        >
                                            {showNumber ? (
                                                <EyeOff size={14} />
                                            ) : (
                                                <Eye size={14} />
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    "—"
                                )}
                            </span>
                        </div>

                        <ProfileRow
                            label="Age"
                            value={
                                patient.age != null ? `${patient.age} yrs` : "—"
                            }
                        />

                        <ProfileRow
                            label="Gender"
                            value={patient.gender || "—"}
                        />
                    </section>

                    <section>
                        <div className="pp-section-label">Account</div>
                        {/* <ProfileRow
                            label="Member since"
                            value={
                                patient.date
                                    ? new Date(patient.date).toLocaleDateString(
                                          "en-US",
                                          { month: "short", year: "numeric" },
                                      )
                                    : "—"
                            }
                        /> */}
                        <ProfileRow
                            label="Doctors linked"
                            value={
                                patient.doctors?.length
                                    ? `${patient.doctors.length} doctor${patient.doctors.length !== 1 ? "s" : ""}`
                                    : "None yet"
                            }
                        />
                    </section>
                </div>
            </div>

            {showModal && (
                <EditProfileModal
                    patient={patient}
                    onClose={() => setShowModal(false)}
                    onUpdate={(updated) => {
                        updatePatient(updated);
                        setShowModal(false);
                    }}
                />
            )}
        </div>
    );
};

const ProfileRow = ({ label, value }) => (
    <div className="pp-row">
        <span className="pp-row-label">{label}</span>
        <span className="pp-row-value">{value}</span>
    </div>
);

export default PatientProfile;
