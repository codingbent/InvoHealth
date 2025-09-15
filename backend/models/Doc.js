const mongoose = require("mongoose");
const { Schema } = mongoose;

const DocSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    clinicName: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
    },
    gstNumber: {
        type: String,
    },
});

const Doc = mongoose.model("doc", DocSchema);
module.exports = Doc;
