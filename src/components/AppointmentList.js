import { useEffect, useRef } from "react";
import AppointmentDay from "./AppointmentDay";
import { IndianRupee } from "lucide-react";

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
    }, [loading, IncreaseLimit]);

    const role = localStorage.getItem("role");
    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);

    if (loading && appointments.length === 0) {
        return (
            <div>
                {[1, 2, 3].map((i) => (
                    <div key={i} style={{ marginBottom: 24 }}>
                        <div
                            className="pl-skeleton"
                            style={{
                                height: 36,
                                borderRadius: 8,
                                marginBottom: 10,
                            }}
                        />
                        <div className="pl-table-card">
                            {[1, 2, 3, 4].map((j) => (
                                <div className="pl-skeleton-row" key={j}>
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "22%", height: 12 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "10%", height: 12 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "12%", height: 18 }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{
                                            width: "10%",
                                            height: 12,
                                            marginLeft: "auto",
                                        }}
                                    />
                                    <div
                                        className="pl-skeleton"
                                        style={{ width: "12%", height: 18 }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    return (
        <>
            {!loading && appointments.length === 0 && (
                <div className="al-empty">
                    <div className="al-empty-icon">◎</div>
                    No records match the selected filters
                </div>
            )}

            {Object.keys(appointmentsByMonth).map((month) => (
                <div key={month} className="al-month-block">
                    <div className="al-month-header">
                        <div className="al-month-left">
                            <span className="al-month-name">{month}</span>
                            <div className="al-month-line" />
                        </div>
                        {role === "doctor" && (
                            <div className="al-month-total">
                                <IndianRupee size={13} />
                                {fmt(monthTotal[month])}
                            </div>
                        )}
                    </div>

                    {Object.keys(appointmentsByMonth[month]).map((day) => (
                        <AppointmentDay
                            key={day}
                            day={day}
                            dayApps={appointmentsByMonth[month][day]}
                            paymentColor={paymentColor}
                            navigate={navigate}
                            loading={loading}
                        />
                    ))}
                </div>
            ))}

            {appointments.length < total && (
                <div ref={loadMoreRef} className="al-load-more">
                    {loading && (
                        <>
                            <span className="al-loading-dot" />
                            <span className="al-loading-dot" />
                            <span className="al-loading-dot" />
                        </>
                    )}
                </div>
            )}
        </>
    );
}
