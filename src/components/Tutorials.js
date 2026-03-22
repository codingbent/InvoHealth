import { useState, useMemo } from "react";
import {
    Rocket,
    Users,
    FileText,
    UserCog,
    BarChart3,
    Image,
} from "lucide-react";

const tutorials = {
    "Getting Started": [
        { title: "Create Account (Sign Up)", video: "..." },
        { title: "Login to Dashboard", video: "..." },
        { title: "Setup Clinic Profile", video: "..." },
    ],

    "Patients & Appointments": [
        { title: "Add New Patient", video: "..." },
        { title: "Search & Manage Patients", video: "..." },
        { title: "Add Appointment", video: "..." },
        { title: "Select Services & Billing", video: "..." },
        { title: "Use Time Slots", video: "..." },
    ],

    "Records & Image Upload": [
        { title: "Upload Prescription / X-ray", video: "..." },
        { title: "Capture Image from Camera", video: "..." },
        { title: "View Patient Records", video: "..." },
        { title: "Upload via Appointment", video: "..." },
    ],

    "Billing & Invoices": [
        { title: "Generate Invoice", video: "..." },
        { title: "Track Payments (Paid / Partial / Unpaid)", video: "..." },
        { title: "Download Invoice PDF", video: "..." },
        { title: "Export to Excel", video: "..." },
    ],

    "Staff & Roles": [
        { title: "Add Staff", video: "..." },
        // { title: "Manage Permissions", video: "..." },
    ],

    "Analytics & Reports": [
        { title: "Dashboard Overview", video: "..." },
        { title: "Revenue Insights", video: "..." },
    ],
};

const sectionIcons = {
    "Getting Started": <Rocket size={16} />,
    "Patients & Appointments": <Users size={16} />,
    "Records & Image Upload": <Image size={16} />,
    "Billing & Invoices": <FileText size={16} />,
    "Staff & Roles": <UserCog size={16} />,
    "Analytics & Reports": <BarChart3 size={16} />,
};

const sectionColors = {
    "Getting Started": "#60a5fa",
    "Patients & Appointments": "#4ade80",
    "Records & Image Upload": "#38bdf8",
    "Billing & Invoices": "#fb923c",
    "Staff & Roles": "#a78bfa",
    "Analytics & Reports": "#f472b6",
};

export default function Tutorials() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [expandedSections, setExpandedSections] = useState(
        Object.keys(tutorials).reduce((acc, k) => ({ ...acc, [k]: true }), {}),
    );
    const allVideos = useMemo(() => Object.values(tutorials).flat(), []);
    const [currentVideo, setCurrentVideo] = useState(allVideos[0]);

    const handleVideoClick = (video) => {
        setCurrentVideo(video);
        setSidebarOpen(false);
    };
    const toggleSection = (section) =>
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    const currentIndex = allVideos.findIndex(
        (v) => v.title === currentVideo.title,
    );
    const goNext = () =>
        currentIndex < allVideos.length - 1 &&
        handleVideoClick(allVideos[currentIndex + 1]);
    const goPrev = () =>
        currentIndex > 0 && handleVideoClick(allVideos[currentIndex - 1]);
    const currentSection = Object.entries(tutorials).find(([, vids]) =>
        vids.some((v) => v.title === currentVideo.title),
    )?.[0];

    return (
        <>
            <div className="tut-root">
                {sidebarOpen && (
                    <div
                        className="tut-overlay"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* ── Sidebar ── */}
                <aside className={`tut-sidebar ${sidebarOpen ? "open" : ""}`}>
                    <div className="tut-sidebar-header">
                        {/* <div className="tut-brand">InvoHealth · Learn</div> */}
                        <div className="tut-sidebar-title">
                            Tutorial <em>Library</em>
                        </div>
                    </div>

                    <nav className="tut-nav">
                        {Object.entries(tutorials).map(([section, vids]) => (
                            <div className="tut-section" key={section}>
                                <div
                                    className="tut-section-header"
                                    onClick={() => toggleSection(section)}
                                >
                                    <span
                                        className="tut-section-icon"
                                        style={{
                                            color: sectionColors[section],
                                        }}
                                    >
                                        {sectionIcons[section]}
                                    </span>
                                    <span className="tut-section-name">
                                        {section}
                                    </span>
                                    <span
                                        className={`tut-section-chevron ${expandedSections[section] ? "open" : ""}`}
                                    >
                                        ▶
                                    </span>
                                </div>
                                {expandedSections[section] && (
                                    <div className="tut-items">
                                        {vids.map((video, i) => (
                                            <div
                                                key={i}
                                                className={`tut-item ${currentVideo.title === video.title ? "active" : ""}`}
                                                style={
                                                    currentVideo.title ===
                                                    video.title
                                                        ? {
                                                              color: sectionColors[
                                                                  section
                                                              ],
                                                          }
                                                        : {}
                                                }
                                                onClick={() =>
                                                    handleVideoClick(video)
                                                }
                                            >
                                                <span className="tut-item-dot" />
                                                <span>{video.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* ── Main ── */}
                <main className="tut-main">
                    <div className="tut-topbar">
                        <div className="tut-breadcrumb">
                            <span className="tut-breadcrumb-section">
                                {currentSection}
                            </span>
                            <span className="tut-breadcrumb-sep">/</span>
                            <span className="tut-breadcrumb-title">
                                {currentVideo.title}
                            </span>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "center",
                            }}
                        >
                            <div className="tut-nav-btns">
                                <button
                                    className="tut-nav-btn"
                                    onClick={goPrev}
                                    disabled={currentIndex === 0}
                                >
                                    ← Prev
                                </button>
                                <button
                                    className="tut-nav-btn"
                                    onClick={goNext}
                                    disabled={
                                        currentIndex === allVideos.length - 1
                                    }
                                >
                                    Next →
                                </button>
                            </div>
                            <button
                                className="tut-menu-btn"
                                onClick={() => setSidebarOpen(true)}
                            >
                                ☰
                            </button>
                        </div>
                    </div>

                    <div className="tut-content">
                        <div className="tut-video-label">
                            <span
                                className="tut-video-label-dot"
                                style={{
                                    background: sectionColors[currentSection],
                                }}
                            />
                            {currentSection}
                        </div>
                        <h1 className="tut-video-title">
                            {currentVideo.title}
                        </h1>

                        <div className="tut-video-frame">
                            <div className="tut-video-placeholder">
                                <div className="tut-play-icon">▶</div>
                                <div className="tut-placeholder-text">
                                    Video · {currentVideo.title}
                                </div>
                            </div>
                            {/* <iframe src={currentVideo.video} title={currentVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> */}
                        </div>

                        <div className="tut-meta">
                            <div className="tut-counter">
                                <span>{currentIndex + 1}</span> /{" "}
                                {allVideos.length}
                            </div>
                            <div className="tut-bottom-nav">
                                <button
                                    className="tut-big-btn prev"
                                    onClick={goPrev}
                                    disabled={currentIndex === 0}
                                >
                                    ← Previous
                                </button>
                                <button
                                    className="tut-big-btn next"
                                    onClick={goNext}
                                    disabled={
                                        currentIndex === allVideos.length - 1
                                    }
                                >
                                    Next lesson →
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
