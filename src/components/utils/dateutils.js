export const getTodayLocal = () => {
    return new Date().toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD format
};


export const isToday = (dateStr) => {
    return dateStr === getTodayLocal();
};