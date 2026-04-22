import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function SuccessOverlay({
    visible,
    onDone,
    title = "Success",
    sub = "Operation complete",
    variant = "green",
    duration = 2000,
}) {
    const [phase, setPhase] = useState("hidden");

    useEffect(() => {
        if (!visible) {
            setPhase("hidden");
            return;
        }
        setPhase("entering");
        const t1 = setTimeout(() => setPhase("visible"), 50);
        const t2 = setTimeout(() => setPhase("leaving"), duration);
        const t3 = setTimeout(() => {
            setPhase("hidden");
            onDone?.();
        }, duration + 400);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    }, [visible, duration, onDone]);

    if (phase === "hidden") return null;

    const isGreen = variant !== "purple";

    return createPortal(
        <div className={`sox-backdrop ${phase}`}>
            <div
                className={`sox-card sox-card--${phase} ${isGreen ? "sox-green" : "sox-purple"}`}
            >
                {/* Animated corner brackets */}
                <svg
                    className="sox-corner sox-tl"
                    viewBox="0 0 28 28"
                    fill="none"
                >
                    <path d="M2 18 L2 2 L18 2" />
                </svg>
                <svg
                    className="sox-corner sox-tr"
                    viewBox="0 0 28 28"
                    fill="none"
                >
                    <path d="M26 18 L26 2 L10 2" />
                </svg>
                <svg
                    className="sox-corner sox-bl"
                    viewBox="0 0 28 28"
                    fill="none"
                >
                    <path d="M2 10 L2 26 L18 26" />
                </svg>
                <svg
                    className="sox-corner sox-br"
                    viewBox="0 0 28 28"
                    fill="none"
                >
                    <path d="M26 10 L26 26 L10 26" />
                </svg>

                {/* Top scan line */}
                <div className="sox-scan" />

                {/* Icon */}
                <div className="sox-icon-area">
                    <div className="sox-ring sox-r1" />
                    <div className="sox-ring sox-r2" />
                    <div className="sox-ring sox-r3" />

                    {/* 12 burst particles */}
                    {[...Array(12)].map((_, i) => (
                        <span key={i} className={`sox-p sox-p${i}`} />
                    ))}

                    <div className="sox-check-bg">
                        <svg
                            className="sox-check-svg"
                            viewBox="0 0 52 52"
                            fill="none"
                        >
                            <circle
                                className="sox-track"
                                cx="26"
                                cy="26"
                                r="22"
                            />
                            <circle
                                className="sox-progress-circle"
                                cx="26"
                                cy="26"
                                r="22"
                            />
                            <polyline
                                className="sox-tick"
                                points="15,26 22,34 37,17"
                            />
                        </svg>
                    </div>
                </div>

                <p className="sox-title">{title}</p>
                <p className="sox-sub">{sub}</p>

                {/* Auto-dismiss progress bar */}
                <div className="sox-bar-wrap">
                    <div
                        className="sox-bar"
                        style={{ animationDuration: `${duration}ms` }}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
}
