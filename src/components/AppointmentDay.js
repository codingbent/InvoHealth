import { memo } from "react";

const AppointmentDay = memo(function AppointmentDay({
    day,
    dayApps,
    paymentColor,
    navigate,
}) {
    const dayTotal = dayApps.reduce(
        (sum, a) => sum + Number(a.collected ?? a.amount ?? 0),
        0,
    );

    return (
        <div className="mb-4">
            {/* DAY HEADER */}
            <div className="d-flex justify-content-between align-items-center day-header rounded-3 px-3 py-2 mb-2">
                <h6 className="mb-0 fw-semibold">
                    {new Date(day).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })}
                </h6>

                {localStorage.getItem("role") === "doctor" && (
                    <span className="fw-bold text-success-theme">
                        ₹ {dayTotal.toFixed(0)}
                    </span>
                )}
            </div>

            {/* DESKTOP TABLE */}
            <div className="d-none d-lg-block">
                <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                    <table className="table table-hover align-middle mb-0 table-theme">
                        <colgroup>
                            <col style={{ width: "25%" }} />
                            <col style={{ width: "25%" }} />
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "20%" }} />
                            <col style={{ width: "10%" }} />
                        </colgroup>

                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Payment</th>
                                <th className="text-end">Amount</th>
                                <th className="text-end">Status</th>
                                <th />
                            </tr>
                        </thead>

                        <tbody>
                            {dayApps.map((a, i) => (
                                <tr key={i}>
                                    <td className="fw-semibold text-theme-primary">
                                        {a.name}
                                    </td>

                                    <td>
                                        <span
                                            className={`payment-tag ${
                                                paymentColor[a.payment_type] ||
                                                "payment-other"
                                            }`}
                                        >
                                            {a.payment_type}
                                        </span>
                                    </td>

                                    <td className="text-end">
                                        {(() => {
                                            const collected = Number(
                                                a.collected ?? 0,
                                            );
                                            const total = Number(a.amount ?? 0);
                                            const isPaid =
                                                collected <= total && total > 0;

                                            return isPaid ? (
                                                <span className="fw-bold text-theme-primary">
                                                    ₹ {total}
                                                </span>
                                            ) : (
                                                <div>
                                                    <div className="fw-bold text-theme-primary">
                                                        ₹ {collected}
                                                    </div>
                                                    <small className="text-theme-primary d-block">
                                                        of ₹ {total}
                                                    </small>
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="text-end">
                                        <span
                                            className={`status-badge ${
                                                a.status === "Paid"
                                                    ? "status-paid"
                                                    : a.status === "Partial"
                                                      ? "status-partial"
                                                      : "status-unpaid"
                                            }`}
                                        >
                                            {a.status}
                                        </span>
                                    </td>
                                    <td className="text-end">
                                        <button
                                            className="btn btn-sm btn-outline-theme"
                                            onClick={() =>
                                                navigate(
                                                    `/patient/${a.patientId}`,
                                                )
                                            }
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="d-lg-none">
                {dayApps.map((a, i) => (
                    <div
                        key={i}
                        className="card theme-card rounded-4"
                        onClick={() => navigate(`/patient/${a.patientId}`)}
                        style={{ cursor: "pointer" }}
                    >
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 className="fw-semibold mb-1">
                                        {a.name}
                                    </h6>

                                    <span
                                        className={`payment-tag ${
                                            paymentColor[a.payment_type] ||
                                            "payment-other"
                                        }`}
                                    >
                                        {a.payment_type}
                                    </span>
                                </div>

                                {/* Amount Section */}
                                <div className="text-end">
                                    {(() => {
                                        const collected = Number(
                                            a.collected ?? 0,
                                        );
                                        const total = Number(a.amount ?? 0);
                                        const isPaid =
                                            collected >= total && total > 0;

                                        return isPaid ? (
                                            <span className="fw-bold text-success-theme">
                                                ₹ {total}
                                            </span>
                                        ) : (
                                            <div>
                                                <div className="fw-bold text-theme-primary">
                                                    ₹ {collected}
                                                </div>
                                                <small className="text-theme-muted d-block">
                                                    of ₹ {total}
                                                </small>
                                            </div>
                                        );
                                    })()}
                                    <div className="mt-1">
                                        <span
                                            className={`status-badge ${
                                                a.status === "Paid"
                                                    ? "status-paid"
                                                    : a.status === "Partial"
                                                      ? "status-partial"
                                                      : "status-unpaid"
                                            }`}
                                        >
                                            {a.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default AppointmentDay;
