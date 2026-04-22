const mongoose = require("mongoose");
const { Schema } = mongoose;

const PatientSchema = new Schema({
    name: {
        type: String,
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
    doctor: {
        type: Schema.Types.ObjectId,
        ref: "Doc",
        required: true,
    },
});
PatientSchema.index({ doctor: 1, name: 1 });
const Patient = mongoose.model("Patient", PatientSchema);
module.exports = Patient;
