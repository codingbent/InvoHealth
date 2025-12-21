export default function LoadMore({ onLoadMore }) {
    return (
        <div className="d-flex justify-content-center mb-2">
            <button className="btn btn-primary" onClick={onLoadMore}>
                Load More
            </button>
        </div>
    );
}
