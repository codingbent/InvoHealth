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

        slots.push(`${hours}:${minutes}`); // ✅ always 24-hour

        current.setMinutes(current.getMinutes() + duration);
    }

    return slots;
};

export const getNextAvailableSlot = (slots, bookedSlots) => {
    if (!slots?.length) return null;

    const bookedSet = new Set(bookedSlots || []);

    return slots.find((slot) => !bookedSet.has(slot)) || null;
};