import "../css/Dashboard.css";

export default function DashboardSkeleton() {
    return (
        <>
            {/* 5 KPI cards */}
            <div
                className="sk-kpi-row"
                style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
            >
                {[1, 2, 3, 4, 5].map((i) => (
                    <div className="sk-kpi" key={i}>
                        <div className="sk-kpi-top">
                            <div className="sk-base sk-label" />
                            <div className="sk-base sk-icon-sq" />
                        </div>
                        <div className="sk-base sk-value" />
                        <div
                            className="sk-base"
                            style={{ height: 8, width: 80, marginTop: 10 }}
                        />
                    </div>
                ))}
            </div>

            {/* Row 1: Donut + Bar */}
            <div className="sk-charts-row" style={{ marginBottom: 16 }}>
                <div className="sk-card">
                    <div className="sk-card-header">
                        <div className="sk-base sk-card-header-line" />
                    </div>
                    <div className="sk-card-inner">
                        <div className="sk-donut-row">
                            <div className="sk-base sk-donut" />
                            <div className="sk-legend-rows">
                                {[80, 65, 90, 55, 70].map((w, i) => (
                                    <div className="sk-legend-row" key={i}>
                                        <div className="sk-dot" />
                                        <div
                                            className="sk-base sk-legend-name"
                                            style={{ width: w }}
                                        />
                                        <div className="sk-base sk-legend-val" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="sk-card">
                    <div className="sk-card-header">
                        <div className="sk-base sk-card-header-line" />
                    </div>
                    <div className="sk-card-inner">
                        <div
                            style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "flex-end",
                                height: 200,
                            }}
                        >
                            {[60, 120, 80, 150, 100, 90].map((h, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        gap: 8,
                                        justifyContent: "flex-end",
                                        height: "100%",
                                    }}
                                >
                                    <div
                                        className="sk-base sk-bar"
                                        style={{ width: "100%", height: h }}
                                    />
                                    <div
                                        className="sk-base"
                                        style={{
                                            height: 7,
                                            width: "70%",
                                            borderRadius: 4,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Row 2: Line + Summary */}
            <div className="sk-charts-row">
                <div className="sk-card">
                    <div className="sk-card-header">
                        <div className="sk-base sk-card-header-line" />
                    </div>
                    <div className="sk-card-inner">
                        <div
                            style={{
                                height: 160,
                                display: "flex",
                                alignItems: "flex-end",
                                gap: 8,
                            }}
                        >
                            {[
                                90, 60, 110, 75, 130, 85, 120, 95, 70, 140, 100,
                                115,
                            ].map((h, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        display: "flex",
                                        flexDirection: "column",
                                        justifyContent: "flex-end",
                                        height: "100%",
                                    }}
                                >
                                    <div
                                        className="sk-base"
                                        style={{ height: h, borderRadius: 3 }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sk-card">
                    <div className="sk-card-header">
                        <div className="sk-base sk-card-header-line" />
                    </div>
                    <div
                        className="sk-card-inner"
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 20,
                        }}
                    >
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <div className="sk-dot" />
                                    <div
                                        className="sk-base"
                                        style={{ height: 8, width: 60 }}
                                    />
                                </div>
                                <div
                                    className="sk-base"
                                    style={{ height: 14, width: 80 }}
                                />
                            </div>
                        ))}
                        <div
                            className="sk-base"
                            style={{
                                height: 6,
                                width: "100%",
                                borderRadius: 99,
                            }}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}
