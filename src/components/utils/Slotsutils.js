export const generateSlots = (start, end, duration = 15) => {
    const slots = [];

    let [h, m] = start.split(":").map(Number);
    let [endH, endM] = end.split(":").map(Number);

    let current = new Date();
    current.setHours(h, m, 0, 0);

    const endTime = new Date();
    endTime.setHours(endH, endM, 0, 0);

    while (current < endTime) {
        const hours = String(current.getHours()).padStart(2, "0");
        const minutes = String(current.getMinutes()).padStart(2, "0");

        slots.push(`${hours}:${minutes}`);

        current = new Date(current.getTime() + duration * 60000);
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
