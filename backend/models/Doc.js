const mongoose = require("mongoose");
const { Schema } = mongoose;

// Slot schema
// const SlotSchema = new Schema({
//     start: {
//         type: String, // e.g., "10:00"
//         required: true,
//     },
//     end: {
//         type: String, // e.g., "12:00"
//         required: true,
//     },
// });

// Timing schema
// const TimingSchema = new Schema({
//     days: [
//         {
//             type: String, // e.g., "Mon", "Tue", "Wed"
//             required: true,
//         },
//     ],
//     slots: [SlotSchema], // Multiple start–end slots per timing group
//     note: {
//         type: String, // e.g., "By Call Appointment"
//     },
// });

const DocSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    clinicName: { type: String, required: true },

    phone: { type: String, required: true }, // Doctor main contact
    appointmentPhone: { type: String }, // Secondary contact

    address: {
        line1: { type: String, required: true },
        line2: { type: String },
        line3: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },

    regNumber: { type: String },

    experience: {
        type: String, // e.g., "22+ years"
        required: true,
    },

    degree: {
        type: [String], // array of degrees
        required: true,
    },

    // timings: [TimingSchema], // New structure
});

const Doc = mongoose.model("Doc", DocSchema);
module.exports = Doc;
