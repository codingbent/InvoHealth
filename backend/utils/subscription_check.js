const normalizeDate = (d) => {
    const date = new Date(d);
    date.setHours(0, 0, 0, 0);
    return date;
};

const checkSubscription = async (doctor) => {
    if (!doctor.subscription?.expiryDate) return doctor;

    const today = normalizeDate(new Date());
    const expiry = normalizeDate(doctor.subscription.expiryDate);

    let updated = false;

    // EXPIRED
    if (expiry <= today && doctor.subscription.status !== "expired") {
        doctor.subscription.status = "expired";
        doctor.usage = {
            ...doctor.usage,
            excelExports: 0,
            invoiceDownloads: 0,
            imageUploads: 0,
        };
        updated = true;
    }

    // ACTIVE (IMPORTANT FIX)
    if (expiry > today && doctor.subscription.status !== "active") {
        doctor.subscription.status = "active";
        updated = true;
    }

    if (updated) await doctor.save();

    return doctor;
};

module.exports = checkSubscription;
