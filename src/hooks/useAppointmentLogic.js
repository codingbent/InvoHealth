import { useState, useEffect, useMemo } from "react";

export const useAppointmentLogic = ({
    availability,
    appointmentDate,
    showModal,
}) => {
    const [timeSlots, setTimeSlots] = useState([]);
    const [bookedSlots, setBookedSlots] = useState([]);

    useEffect(() => {
        // move fetchSlots here
    }, [appointmentDate, showModal, availability]);

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
