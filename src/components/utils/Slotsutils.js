export const generateSlots = (start, end, duration = 15) => {
    const slots = [];

    let [sh, sm] = start.split(":").map(Number);
    let [eh, em] = end.split(":").map(Number);

    let current = sh * 60 + sm;
    const endTime = eh * 60 + em;

    while (current < endTime) {
        const h = String(Math.floor(current / 60)).padStart(2, "0");
        const m = String(current % 60).padStart(2, "0");

        slots.push(`${h}:${m}`);
        current += duration;
    }

    return slots;
};

export const getNextAvailableSlot = (
    slots,
    bookedSlots,
    currentSlot,
    isToday,
) => {
    if (!slots?.length) return null;

    const bookedSet = new Set(bookedSlots || []);

    //  FUTURE DATE → always return first available
    if (!isToday) {
        return slots.find((s) => !bookedSet.has(s)) || null;
    }

    // If no currentSlot → return first available
    if (!currentSlot) {
        return slots.find((s) => !bookedSet.has(s)) || null;
    }

    let currentIndex = slots.indexOf(currentSlot);

    //  FIX: if not found, find closest past slot
    if (currentIndex === -1) {
        const [h, m] = currentSlot.split(":").map(Number);
        const nowMinutes = h * 60 + m;

        currentIndex = slots.findLastIndex((slot) => {
            const [sh, sm] = slot.split(":").map(Number);
            return sh * 60 + sm <= nowMinutes;
        });
    }

    //  forward search
    for (let i = currentIndex + 1; i < slots.length; i++) {
        if (!bookedSet.has(slots[i])) return slots[i];
    }

    //  backward fallback
    for (let i = currentIndex - 1; i >= 0; i--) {
        if (!bookedSet.has(slots[i])) return slots[i];
    }

    return null;
};
