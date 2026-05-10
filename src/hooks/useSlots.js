import { useCallback, useEffect, useState } from "react";
import { generateSlots } from "../components/utils/Slotsutils";
import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const useSlots = (availability, selectedDate, showModal) => {
    const [timeSlots, setTimeSlots] = useState([]);
    const [groupedSlots, setGroupedSlots] = useState({
        Morning: [],
        Afternoon: [],
        Evening: [],
    });
    const [bookedSlots, setBookedSlots] = useState([]);

    // True only after the first booked-slots fetch for the current date has
    // settled (success or error). Used by consumers to delay auto-select until
    // they have real booked data — prevents selecting an already-booked slot
    // because the slot list rendered before the API response arrived.
    const [bookedSlotsReady, setBookedSlotsReady] = useState(false);

    // Incrementing this triggers a booked-slots re-fetch without changing
    // selectedDate or showModal (used after a successful appointment save).
    const [refreshKey, setRefreshKey] = useState(0);

    const refetchBookedSlots = useCallback(() => {
        setRefreshKey((k) => k + 1);
    }, []);

    // Reset ready flag whenever the date changes or modal closes so a
    // re-open or date change doesn't use stale "ready" state.
    useEffect(() => {
        setBookedSlotsReady(false);
    }, [selectedDate, showModal]);

    // FETCH BOOKED SLOTS
    useEffect(() => {
        if (!selectedDate || !showModal) return;

        const fetchBooked = async () => {
            try {
                const res = await authFetch(
                    `${API_BASE_URL}/api/doctor/appointment/booked_slots?date=${selectedDate}`,
                );
                const data = await res.json();
                setBookedSlots(data.slots || []);
            } catch (err) {
                console.error("Booked slots error:", err);
                setBookedSlots([]);
            } finally {
                // Mark ready regardless of success/error — a failed fetch means
                // we treat all slots as available (safer than blocking forever).
                setBookedSlotsReady(true);
            }
        };

        fetchBooked();

        // refreshKey is intentionally in the dep array — incrementing it is the
        // only way to force a re-fetch while selectedDate and showModal stay the same.
    }, [selectedDate, showModal, refreshKey]);

    // GENERATE SLOTS
    useEffect(() => {
        if (!availability || !selectedDate) return;

        const day = new Date(selectedDate).toLocaleDateString("en-US", {
            weekday: "short",
        });

        const dayData = availability.find((d) => d.day === day);

        if (!dayData || !dayData.slots?.length) {
            setTimeSlots([]);
            setGroupedSlots({
                Morning: [],
                Afternoon: [],
                Evening: [],
            });
            return;
        }

        let allSlots = [];

        dayData.slots.forEach((slot) => {
            const generated = generateSlots(
                slot.startTime,
                slot.endTime,
                slot.slotDuration,
            );
            allSlots.push(...generated);
        });

        allSlots.sort();

        setTimeSlots(allSlots);

        const grouped = {
            Morning: [],
            Afternoon: [],
            Evening: [],
        };

        allSlots.forEach((time) => {
            const hour = parseInt(time.split(":")[0]);

            if (hour < 12) grouped.Morning.push(time);
            else if (hour < 17) grouped.Afternoon.push(time);
            else grouped.Evening.push(time);
        });

        setGroupedSlots(grouped);
    }, [availability, selectedDate]);

    return {
        timeSlots,
        groupedSlots,
        bookedSlots,
        bookedSlotsReady,
        refetchBookedSlots,
    };
};
