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
    const displaySlot = selectedSlot || currentSlot;

    useEffect(() => {
        const targetSlot = selectedSlot || currentSlot || nextSlot;

        if (!targetSlot) return;

        const foundSection = Object.entries(groupedSlots).find(([_, slots]) =>
            slots.includes(targetSlot),
        );

        if (foundSection) {
            const [label] = foundSection;

            setOpenSection(label);
        }
    }, [currentSlot, nextSlot, selectedSlot, groupedSlots,setOpenSection]);
    return (
        <div className="mt-2">
            {/* HEADER */}
            <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="small">Time Slot</span>

                <div className="d-flex gap-2">
                    {currentSlot && (
                        <span className="current-slot-badge">
                            Now: {formatTime(currentSlot)}
                        </span>
                    )}

                    {nextSlot && (
                        <span className="next-slot-badge">
                            Next: {formatTime(nextSlot)}
                        </span>
                    )}
                </div>
            </div>

            {Object.entries(groupedSlots).map(([label, slots]) =>
                slots.length ? (
                    <div key={label} className="accordion-slot">
                        {/* SECTION HEADER */}
                        <div
                            className="accordion-header"
                            onClick={() =>
                                setOpenSection(label)
                            }
                        >
                            <span>{label}</span>
                            <span>{openSection === label ? "-" : "+"}</span>
                        </div>

                        {/* SLOTS */}
                        {openSection === label && (
                            <div className="slot-grid">
                                {slots.map((slot) => {
                                    const isSelected = selectedSlot === slot;
                                    const isBooked = bookedSlots.includes(slot);
                                    const isCurrent = slot === displaySlot;
                                    const isNext = slot === nextSlot;

                                    return (
                                        <button
                                            key={slot}
                                            type="button"
                                            disabled={isBooked}
                                            className={`slot-btn 
                                                ${isSelected ? "selected" : ""} 
                                                ${isBooked ? "booked" : ""}
                                                ${isCurrent ? "current" : ""}
                                                ${isNext ? "next" : ""}
                                            `}
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
    );
}
