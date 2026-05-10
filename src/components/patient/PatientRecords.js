import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
// import { usePatient } from "../../context/PatientContext";
import "../../css/patient/PatientRecords.css";
import { File } from "lucide-react";

export default function PatientRecords({ showAlert }) {
    const token = localStorage.getItem("patient_token");
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDoctor, setOpenDoctor] = useState(null);
    const [lightboxImg, setLightboxImg] = useState(null);

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/patient/records`, {
                    headers: {
                        "auth-token": token,
                    },
                });

                const data = await res.json();

                if (data.success) {
                    setRecords(data.records);
                } else {
                    showAlert?.(
                        data.error || "Failed to load records",
                        "danger",
                    );
                }
            } catch {
                showAlert?.("Server error", "danger");
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [token,showAlert]);

    const grouped = records.reduce((acc, r) => {
        const key = r.doctor?.name || "Unknown Doctor";
        if (!acc[key]) acc[key] = [];
        acc[key].push(r);
        return acc;
    }, {});

    if (loading) {
        return <div className="pr-loading">Loading reports...</div>;
    }

    return (
        <>
            <div className="pr-root">
                <h2 className="pr-title">Your Medical Reports</h2>

                {records.length === 0 ? (
                    <div className="pr-empty">No reports found yet.</div>
                ) : (
                    <div className="pr-list">
                        {Object.entries(grouped).map(([doctor, recs]) => (
                            <div key={doctor} className="pr-group">
                                {/* Accordion Header */}
                                <div
                                    className="pr-group-header"
                                    onClick={() =>
                                        setOpenDoctor(
                                            openDoctor === doctor
                                                ? null
                                                : doctor,
                                        )
                                    }
                                >
                                    <div>
                                        <div className="pr-group-name">
                                            {doctor}
                                        </div>
                                        {recs[0]?.doctor?.specialization
                                            ?.length > 0 && (
                                            <div className="pr-group-sub">
                                                {recs[0].doctor.specialization.join(
                                                    ", ",
                                                )}
                                            </div>
                                        )}
                                    </div>{" "}
                                    <span className="pr-group-count">
                                        {recs.length} reports
                                    </span>
                                </div>

                                {/* Accordion Body */}
                                {openDoctor === doctor && (
                                    <div className="pr-group-body">
                                        {recs.map((r) => (
                                            <div
                                                key={r._id}
                                                className="pr-image-card"
                                            >
                                                {/* Date overlay */}
                                                <div className="pr-date-overlay">
                                                    {new Date(
                                                        r.date,
                                                    ).toLocaleDateString(
                                                        "en-IN",
                                                        {
                                                            day: "numeric",
                                                            month: "short",
                                                        },
                                                    )}
                                                </div>

                                                {r.images.map((img, i) =>
                                                    img.type ===
                                                    "application/pdf" ? (
                                                        <a
                                                            key={i}
                                                            href={img.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="pr-pdf"
                                                        >
                                                            <File size={16} />
                                                        </a>
                                                    ) : (
                                                        <img
                                                            src={img.url}
                                                            alt="record"
                                                            className="pr-img"
                                                            onClick={() =>
                                                                setLightboxImg({
                                                                    url: img.url,
                                                                    type:
                                                                        img.type ||
                                                                        "image",
                                                                    idx: i,
                                                                    date: new Date(
                                                                        r.date,
                                                                    ).toLocaleDateString(
                                                                        "en-IN",
                                                                    ),
                                                                    allImgs:
                                                                        r.images.filter(
                                                                            (
                                                                                i,
                                                                            ) =>
                                                                                i.type !==
                                                                                "application/pdf",
                                                                        ),
                                                                })
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {lightboxImg && (
                <div
                    className="pr-lightbox-bg"
                    onClick={() => setLightboxImg(null)}
                >
                    <button
                        className="pr-lightbox-close"
                        onClick={() => setLightboxImg(null)}
                    >
                        ✕
                    </button>

                    <img
                        className="pr-lightbox-img"
                        src={lightboxImg.url}
                        alt="preview"
                    />

                    <div className="pr-lightbox-date">{lightboxImg.date}</div>
                </div>
            )}
        </>
    );
}
