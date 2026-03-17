const mongoose = require("mongoose");
const { Schema } = mongoose;

const SubscriptionSchema = new Schema(
    {
        plan: {
            type: String,
            enum: ["FREE", "STARTER", "PRO", "ENTERPRISE"],
            default: "FREE",
        },

        billingCycle: {
            type: String,
            enum: ["monthly", "yearly"],
            default: "monthly",
        },

        status: {
            type: String,
            enum: ["active", "expired", "cancelled"],
            default: "active",
        },

        startDate: {
            type: Date,
            default: Date.now,
        },

        expiryDate: {
            type: Date,
        },

        paymentId: {
            type: String,
        },

        orderId: {
            type: String,
        },

        amountPaid: {
            type: Number,
        },

        currency: {
            type: String,
            default: "INR",
        },
    },
    { _id: false },
);

const UsageSchema = new Schema(
    {
        excelExports: {
            type: Number,
            default: 0,
        },

        invoiceDownloads: {
            type: Number,
            default: 0,
        },
    },
    { _id: false },
);

const DocSchema = new Schema(
    {
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
            unique: true,
        },

        appointmentPhone: String,

        address: {
            line1: { type: String, required: true },
            line2: String,
            line3: String,
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        regNumber: String,

        experience: {
            type: Number,
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

        subscription: SubscriptionSchema,
        usage: UsageSchema,
    },
    { timestamps: true },
);

module.exports = mongoose.model("Doc", DocSchema);
