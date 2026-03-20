export default function DashboardSkeleton() {
    return (
        <div>
            {/* KPI Skeleton */}
            <div className="row g-3 mb-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="col-6 col-md-3">
                        <div className="kpi-card skeleton-card">
                            <div className="skeleton skeleton-text mb-2"></div>
                            <div className="skeleton skeleton-value"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Skeleton */}
            <div className="row g-4">
                <div className="col-lg-6">
                    <div className="dashboard-card p-4 skeleton-card">
                        <div className="skeleton skeleton-title mb-3"></div>
                        <div className="skeleton skeleton-chart"></div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="dashboard-card p-4 skeleton-card">
                        <div className="skeleton skeleton-title mb-3"></div>
                        <div className="skeleton skeleton-chart"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}