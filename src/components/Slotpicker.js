import { useEffect } from "react";

export default function Slotpicker({
    groupedSlots,
    selectedSlot,
    setSelectedSlot,
    bookedSlots,
    openSection,
    setOpenSection,
    formatTime,
    currentSlot,
    nextSlot,
}) {
    const displaySlot = selectedSlot || nextSlot || currentSlot;

    useEffect(() => {
        const targetSlot = selectedSlot || nextSlot || currentSlot;
        if (!targetSlot) return;
        const foundSection = Object.entries(groupedSlots).find(([_, slots]) =>
            slots.includes(targetSlot),
        );
        if (foundSection) {
            const [label] = foundSection;
            setOpenSection(label);
        }
    }, [currentSlot, nextSlot, selectedSlot, groupedSlots, setOpenSection]);

    return (
        <>
            <div className="sp-wrap">
                <div className="sp-header-row">
                    <span className="sp-time-label">
                        Time Slot
                        <span className="sg-required">
                            <sup>*</sup>
                        </span>
                    </span>
                    <div className="sp-badges">
                        {currentSlot && (
                            <span className="sp-now-badge">
                                Now: {formatTime(selectedSlot)}
                            </span>
                        )}
                        {nextSlot && (
                            <span className="sp-next-badge">
                                Next: {formatTime(nextSlot)}
                            </span>
                        )}
                    </div>
                </div>

                {Object.entries(groupedSlots).map(([label, slots]) =>
                    slots.length ? (
                        <div key={label} className="sp-section">
                            <div
                                className={`sp-section-header ${openSection === label ? "open" : ""}`}
                                onClick={() => setOpenSection(label)}
                            >
                                <span>{label}</span>
                                <span style={{ fontSize: 14 }}>
                                    {openSection === label ? "−" : "+"}
                                </span>
                            </div>
                            {openSection === label && (
                                <div className="sp-slot-grid">
                                    {slots.map((slot) => {
                                        const isSelected =
                                            selectedSlot === slot;
                                        const isBooked =
                                            bookedSlots.includes(slot);
                                        const isCurrent = slot === displaySlot;
                                        const isNext = slot === nextSlot;
                                        return (
                                            <button
                                                key={slot}
                                                type="button"
                                                disabled={isBooked}
                                                className={`sp-slot ${isSelected ? "selected" : ""} ${isBooked ? "booked" : ""} ${isCurrent && !isSelected ? "current" : ""} ${isNext && !isSelected ? "next" : ""}`}
                                                onClick={() =>
                                                    setSelectedSlot(slot)
                                                }
                                            >
                                                {formatTime(slot)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : null,
                )}
            </div>
        </>
    );
}
