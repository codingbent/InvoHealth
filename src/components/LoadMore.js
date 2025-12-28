export default function LoadMore({ onLoadMore }) {
    return (
        <div className="text-center mb-3">
            <button
                className="btn btn-outline-primary text-decoration-none fw-medium"
                onClick={onLoadMore}
            >
                Load more
            </button>
        </div>
    );
}
