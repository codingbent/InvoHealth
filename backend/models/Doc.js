const mongoose = require("mongoose");
const { Schema } = mongoose;

const DocSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    clinicName: { type: String, required: true },

    phone: { type: String, required: true, unique:true }, // Doctor main contact
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
        type: String,
        required: true,
    },

    degree: {
        type: [String], 
        required: true,
    },
});

const Doc = mongoose.model("Doc", DocSchema);
module.exports = Doc;
