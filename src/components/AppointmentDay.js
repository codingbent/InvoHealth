import { memo, useState, useEffect } from "react";
import { IndianRupee, Eye } from "lucide-react";

// Responsive hook — re-renders on window resize
function useIsMobile(breakpoint = 992) {
    const [isMobile, setIsMobile] = useState(
        () => window.innerWidth < breakpoint,
    );
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < breakpoint);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, [breakpoint]);
    return isMobile;
}

const AppointmentDay = memo(function AppointmentDay({
    day,
    dayApps,
    paymentColor,
    navigate,
    loading,
}) {
    const isMobile = useIsMobile();
    const dayTotal = dayApps.reduce(
        (sum, a) => sum + Number(a.collected ?? a.amount ?? 0),
        0,
    );
    const fmt = (v) => new Intl.NumberFormat("en-IN").format(v);
    const getTime = (a) => a.time || "";
    const statusClass = (s) =>
        s === "Paid" ? "pl-paid" : s === "Partial" ? "pl-partial" : "pl-unpaid";

    if (loading) {
        return (
            <div style={{ marginBottom: 24 }}>
                <div
                    className="pl-skeleton"
                    style={{ height: 36, borderRadius: 8, marginBottom: 10 }}
                />
                <div className="pl-table-card">
                    {[1, 2, 3, 4].map((i) => (
                        <div className="pl-skeleton-row" key={i}>
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
                                style={{
                                    width: "12%",
                                    height: 18,
                                    borderRadius: 20,
                                }}
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
                                style={{
                                    width: "12%",
                                    height: 18,
                                    borderRadius: 20,
                                }}
                            />
                            <div
                                className="pl-skeleton"
                                style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 7,
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: 24 }}>
            {/* Day header */}
            <div className="pl-day-header">
                <div className="pl-day-date">
                    {new Date(day).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                    })}
                </div>
                {localStorage.getItem("role") === "doctor" && (
                    <div className="pl-day-total">
                        <IndianRupee size={13} />
                        {fmt(dayTotal)}
                    </div>
                )}
            </div>

            {/* ── Desktop table ── */}
            {!isMobile && (
                <div className="pl-table-card">
                    <table className="pl-table">
                        <colgroup>
                            <col style={{ width: "26%" }} />
                            <col style={{ width: "12%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "16%" }} />
                            <col style={{ width: "14%" }} />
                            <col style={{ width: "10%" }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Time</th>
                                <th>Payment</th>
                                <th className="right">Amount</th>
                                <th className="right">Status</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {dayApps.map((a, i) => (
                                <tr key={i}>
                                    <td className="pl-patient-name">
                                        {a.name}
                                    </td>
                                    <td className="pl-time">{getTime(a)}</td>
                                    <td>
                                        <span
                                            className={
                                                paymentColor[a.payment_type] ||
                                                "pl-tag pl-other"
                                            }
                                        >
                                            {a.payment_type}
                                        </span>
                                    </td>
                                    <td className="right">
                                        {a.status === "Paid" ? (
                                            <div className="pl-amount-main">
                                                <IndianRupee size={12} />{" "}
                                                {fmt(Number(a.amount ?? 0))}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="pl-amount-main">
                                                    <IndianRupee size={12} />{" "}
                                                    {fmt(
                                                        Number(
                                                            a.collected ?? 0,
                                                        ),
                                                    )}
                                                </div>
                                                <div className="pl-amount-sub">
                                                    of <IndianRupee size={11} />{" "}
                                                    {fmt(Number(a.amount ?? 0))}
                                                </div>
                                            </>
                                        )}
                                    </td>
                                    <td className="right">
                                        <span
                                            className={`pl-status ${statusClass(a.status)}`}
                                        >
                                            {a.status}
                                        </span>
                                    </td>
                                    <td className="right">
                                        <button
                                            className="pl-view-btn"
                                            onClick={() =>
                                                navigate(
                                                    `/patient/${a.patientId}`,
                                                )
                                            }
                                        >
                                            <Eye size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Mobile cards ── */}
            {isMobile && (
                <div>
                    {dayApps.map((a, i) => (
                        <div key={i} className="pl-mob-card">
                            {/* Top row: name + amount */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 12,
                                }}
                            >
                                {/* Left */}
                                <div
                                    style={{ flex: 1, minWidth: 0 }}
                                    onClick={() =>
                                        navigate(`/patient/${a.patientId}`)
                                    }
                                >
                                    <div className="pl-mob-name">{a.name}</div>
                                    {getTime(a) && (
                                        <div className="pl-mob-time">
                                            {getTime(a)}
                                        </div>
                                    )}
                                </div>
                                {/* Right: amount */}
                                <div
                                    style={{
                                        textAlign: "right",
                                        flexShrink: 0,
                                    }}
                                >
                                    {a.status === "Paid" ? (
                                        <div className="pl-mob-amount">
                                            <IndianRupee size={13} />{" "}
                                            {fmt(Number(a.amount ?? 0))}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="pl-mob-amount">
                                                <IndianRupee size={13} />{" "}
                                                {fmt(Number(a.collected ?? 0))}
                                            </div>
                                            <div className="pl-mob-sub">
                                                of <IndianRupee size={11} />{" "}
                                                {fmt(Number(a.amount ?? 0))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Bottom row: payment tag + status + view */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginTop: 10,
                                    paddingTop: 10,
                                    borderTop: "1px solid #0d111a",
                                    gap: 8,
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "space-between",
                                        gap: 8,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <span
                                        className={
                                            paymentColor[a.payment_type] ||
                                            "pl-tag pl-other"
                                        }
                                    >
                                        {a.payment_type}
                                    </span>
                                    <span
                                        className={`pl-status ${statusClass(a.status)}`}
                                    >
                                        {a.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

export default AppointmentDay;
