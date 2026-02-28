const mongoose = require("mongoose");
const { subscribe } = require("../routes/authentication");
const { Schema } = mongoose;

const DocSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    clinicName: { type: String, required: true },

    phone: { type: String, required: true, unique: true },
    appointmentPhone: { type: String },

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
    role: {
        type: String,
        default: "doctor",
        enum: ["doctor"],
    },
    staff: [
        {
            type: Schema.Types.ObjectId,
            ref: "Staff",
        },
    ],
    theme: {
        type: String,
        enum: ["light", "dark"],
        default: "light",
    },
    subscription: {
        plan: {
            type: String,
            enum: ["free", "starter", "pro", "enterprise"],
            default: "free",
        },
        status: {
            type: String,
            enum: ["active", "expired", "cancelled"],
            default: "active",
        },
        startDate: Date,
        expiryDate: Date,
        razorpaySubscriptionId: String,
    },
});

const Doc = mongoose.model("Doc", DocSchema);
module.exports = Doc;
