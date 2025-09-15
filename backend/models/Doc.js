const mongoose = require("mongoose");
const { Schema } = mongoose;

const TimingSchema = new Schema({
    day: {
        type: String, // e.g. "Monday", "Tuesday", or "Sunday"
        required: true,
    },
    slots: [
        {
            start: { type: String, required: true }, // e.g. "10:00"
            end: { type: String, required: true }, // e.g. "14:00"
        },
    ],
    note: {
        type: String, // e.g. "By Call Appointment" for Sunday
    },
});

const DocSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    clinicName: { type: String, required: true },

    phone: { type: String, required: true }, // Doctor main contact
    appointmentPhone: { type: String }, // Secondary for appointments

    address: {
        line1: { type: String, required: true }, // required
        line2: { type: String }, // optional
        line3: { type: String }, // optional
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },

    gstNumber: { type: String },

    experience: {
        type: String, // e.g. "22+ years" or just number of years
        required: true,
    },

    timings: [TimingSchema], // Each day with multiple slots
});

const Doc = mongoose.model("doc", DocSchema);
module.exports = Doc;
