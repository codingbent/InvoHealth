import { useEffect, useRef } from "react";
import AppointmentDay from "./AppointmentDay";

export default function AppointmentList({
    appointmentsByMonth,
    monthTotal,
    paymentColor,
    navigate,
    appointments,
    total,
    IncreaseLimit,
    loading,
}) {
    const loadMoreRef = useRef(null);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const firstEntry = entries[0];

                if (
                    firstEntry.isIntersecting &&
                    !loading &&
                    !isFetchingRef.current
                ) {
                    isFetchingRef.current = true;

                    IncreaseLimit();

                    setTimeout(() => {
                        isFetchingRef.current = false;
                    }, 4000);
                }
            },
            { threshold: 1 },
        );

        const current = loadMoreRef.current;

        if (current) observer.observe(current);

        return () => {
            if (current) observer.unobserve(current);
        };
    }, [loading,IncreaseLimit]);

    const role = localStorage.getItem("role");

    const formatCurrency = (value) => {
        return new Intl.NumberFormat("en-IN").format(value);
    };

    return (
        <>
            {Object.keys(appointmentsByMonth).map((month) => (
                <div key={month} className="container-fluid px-3 px-lg-5 py-3">
                    <div className="d-flex justify-content-between align-items-center bg-primary bg-gradient text-white rounded-4 px-3 py-3 mb-3 shadow">
                        <div>
                            <h5 className="mb-0 fw-semibold">{month}</h5>
                        </div>

                        {role === "doctor" && (
                            <h4 className="mb-0 fw-bold">
                                ₹ {formatCurrency(monthTotal[month])}
                            </h4>
                        )}
                    </div>

                    {Object.keys(appointmentsByMonth[month]).map((day) => (
                        <AppointmentDay
                            key={day}
                            day={day}
                            dayApps={appointmentsByMonth[month][day]}
                            paymentColor={paymentColor}
                            navigate={navigate}
                        />
                    ))}
                </div>
            ))}

            {appointments.length < total && (
                <div ref={loadMoreRef} style={{ height: "40px" }}>
                    {loading && <p className="text-center">Loading...</p>}
                </div>
            )}

            {!loading && appointments.length === 0 && (
                <p className="text-center mt-3">
                    No records match the selected filters
                </p>
            )}
        </>
    );
}
