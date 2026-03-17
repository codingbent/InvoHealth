import { useState } from "react";

export default function Tutorials() {
    const tutorials = {
        "Getting Started": [
            {
                title: "Create Account (Sign Up)",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Login to Dashboard",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Setup Clinic Profile",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
        ],

        "Patient Management": [
            {
                title: "Add New Patient",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Edit Patient Details",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Search Patients",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
        ],

        "Billing & Invoices": [
            {
                title: "Create Invoice",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Download Invoice PDF",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Export Billing to Excel",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
        ],

        "Staff Management": [
            {
                title: "Add Staff",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Staff Permissions",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
        ],

        Analytics: [
            {
                title: "Dashboard Overview",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
            {
                title: "Revenue Analytics",
                video: "https://www.youtube.com/embed/VIDEO_ID",
            },
        ],
    };

    const firstVideo = Object.values(tutorials)[0][0];

    const [currentVideo, setCurrentVideo] = useState(firstVideo);

    return (
        <>
            {/* <div className="tutorial-layout">
                {/* SIDEBAR 

                <div className="tutorial-sidebar">
                    <h3>Tutorials</h3>

                    {Object.entries(tutorials).map(([section, videos]) => (
                        <div key={section}>
                            <h4 className="tutorial-section">{section}</h4>

                            {videos.map((video, index) => (
                                <div
                                    key={index}
                                    className={`tutorial-item ${
                                        currentVideo.title === video.title
                                            ? "active"
                                            : ""
                                    }`}
                                    onClick={() => setCurrentVideo(video)}
                                >
                                    {video.title}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {/* VIDEO PLAYER *

                <div className="tutorial-player">
                    <h2>{currentVideo.title}</h2>

                    <div className="video-container">
                        <iframe
                            src={currentVideo.video}
                            title={currentVideo.title}
                            allowFullScreen
                        />
                    </div>
                </div>
            </div> */}
            <span>Currently In production</span>
        </>
    );
}
