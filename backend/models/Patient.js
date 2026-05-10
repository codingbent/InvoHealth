const mongoose = require("mongoose");
const { Schema } = mongoose;

const PatientSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    country: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Country",
        required: true,
    },
    numberEncrypted: {
        type: String,
        required: false,
    },
    numberHash: {
        type: String,
        required: true,
    },
    numberLast4: {
        type: String,
    },
    email: {
        type: String,
        required: false,
        sparse: true,
    },
    amount: {
        type: Number,
        default: 0,
    },
    discount: {
        type: Number,
        default: 0,
    },
    isPercent: {
        type: Boolean,
        default: false,
    },
    dob: {
        type: String,
        match: /^\d{4}-\d{2}-\d{2}$/,
        required: true,
    },
    age: {
        type: Number,
        required: false,
    },
    gender: {
        type: String,
        enum: ["Male", "Female"],
        required: false,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    doctors: [
        {
            type: Schema.Types.ObjectId,
            ref: "Doc",
        },
    ],
});

PatientSchema.index({ doctors: 1, name: 1 });

PatientSchema.index({ numberHash: 1, name: 1, email: 1 });

const Patient = mongoose.model("Patient", PatientSchema);
module.exports = Patient;
