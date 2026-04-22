const Doc = require("../models/Doc");

const getDoctor = async (req, options = {}) => {
    const doctorId =
        req.user.role === "doctor" ? req.user.id : req.user.doctorId;

    const query = Doc.findById(doctorId);

    if (options.select) query.select(options.select);
    if (options.populate) query.populate(options.populate);
    if (options.lean) query.lean();

    const doctor = await query;

    if (!doctor) {
        const err = new Error("Doctor not found");
        err.status = 404;
        throw err;
    }

    // Build payment map ONCE
    let paymentMap = {};
    if (doctor.paymentMethods) {
        doctor.paymentMethods.forEach((pm) => {
            paymentMap[pm._id.toString()] = pm;
        });
    }

    return { doctor, doctorId, paymentMap };
};

module.exports = getDoctor;
