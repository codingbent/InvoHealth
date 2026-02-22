export default function LoadMore({ onLoadMore }) {
    return (
        <div className="load-more-wrapper">
            <button
                className="load-more-btn"
                onClick={onLoadMore}
            >
                Load More
            </button>
        </div>
    );
}