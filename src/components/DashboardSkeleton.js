export default function DashboardSkeleton() {
    return (
        <>
            {/* KPI */}
            <div className="sk-kpi-row">
                {[1, 2, 3, 4].map((i) => (
                    <div className="sk-kpi" key={i}>
                        <div className="sk-kpi-top">
                            <div className="sk-base sk-label" />
                            <div className="sk-base sk-icon-sq" />
                        </div>
                        <div className="sk-base sk-value" />
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="sk-charts-row">
                {/* donut card */}
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

                {/* bar card */}
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
        </>
    );
}
