const mongoose = require("mongoose");
const { Schema } = mongoose;

// Timing schema simplified
const TimingSchema = new Schema({
    day: {
        type: String, // e.g., "Monday", "Tuesday", "Sunday"
        required: true,
    },
    slots: [
        {
            type: String, // e.g., "10:00-14:00"
        },
    ],
    note: {
        type: String, // e.g., "By Call Appointment"
    },
});

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

    gstNumber: { type: String },

    experience: {
        type: String, // e.g., "22+ years"
        required: true,
    },
    Degree:{
        type:Array,
        required:true
    },
    timings: [TimingSchema], // Each day with multiple string slots
});

const Doc = mongoose.model("doc", DocSchema);
module.exports = Doc;