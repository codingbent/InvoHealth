import LoadMore from "./LoadMore";
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
    const role = localStorage.getItem("role");
    return (
        <>
            {/* INITIAL LOADING ONLY */}
            {loading && appointments.length === 0 && (
                <div className="mt-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="d-flex justify-content-between align-items-center p-3 my-2 rounded bg-light"
                        >
                            <div className="placeholder col-4" />
                            <div className="placeholder col-2" />
                            <div className="placeholder col-2" />
                        </div>
                    ))}
                </div>
            )}

            {/* DATA */}
            {Object.keys(appointmentsByMonth).map((month) => (
                <div key={month} className="container-fluid px-3 px-lg-5 py-3">
                    {/* MONTH HEADER */}
                    <div className="d-flex justify-content-between align-items-center bg-primary bg-gradient text-white rounded-4 px-3 py-3 mb-3 shadow">
                        <div>
                            <h5 className="mb-0 fw-semibold">{month}</h5>
                            {role === "doctor" && (
                                <small className="opacity-75">
                                    Total Collection
                                </small>
                            )}
                        </div>

                        {role === "doctor" && (
                            <h4 className="mb-0 fw-bold">
                                ₹ {monthTotal[month]?.toFixed(2)}
                            </h4>
                        )}
                    </div>

                    {/* DAYS */}
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

            {/* LOAD MORE */}
            {appointments.length < total && (
                <LoadMore onLoadMore={IncreaseLimit} />
            )}

            {/* EMPTY STATE */}
            {!loading && appointments.length === 0 && (
                <p className="text-center text-muted mt-3">
                    No records match the selected filters
                </p>
            )}
        </>
    );
}
