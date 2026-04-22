import { useEffect, useState, useMemo } from "react";
import { generateSlots } from "../components/utils/Slotsutils";
import { authFetch } from "../components/authfetch";
import { API_BASE_URL } from "../components/config";

export const useSlots = (availability, appointmentDate, enabled) => {
    const [timeSlots, setTimeSlots] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);

    useEffect(() => {
        if (!enabled || !availability?.length) return;

        const fetchSlots = async () => {
            const res = await authFetch(
                `${API_BASE_URL}/api/doctor/appointment/booked_slots?date=${appointmentDate}`
            );
            const data = await res.json();

            const booked = data?.slots || [];
            setBookedSlots(booked);

            const selectedDay = new Date(appointmentDate)
                .toLocaleDateString("en-US", { weekday: "short" })
                .slice(0, 3);

            const dayData = availability.find((d) =>
                d.day.toLowerCase().startsWith(selectedDay.toLowerCase())
            );

            if (!dayData) return setTimeSlots([]);

            const slots = dayData.slots.flatMap((slot) =>
                generateSlots(
                    slot.startTime,
                    slot.endTime,
                    slot.slotDuration
                )
            );

            setTimeSlots(slots);
        };

        fetchSlots();
    }, [appointmentDate, availability, enabled]);

    const groupedSlots = useMemo(() => {
        const groups = { Morning: [], Afternoon: [], Evening: [] };
        timeSlots.forEach((slot) => {
            const hour = parseInt(slot.split(":")[0]);
            if (hour < 12) groups.Morning.push(slot);
            else if (hour < 16) groups.Afternoon.push(slot);
            else groups.Evening.push(slot);
        });
        return groups;
    }, [timeSlots]);

    return { timeSlots, bookedSlots, groupedSlots };
};