const mongoose = require("mongoose");
const { Schema } = mongoose;

const SubscriptionSchema = new Schema(
    {
        plan: {
            type: String,
            enum: ["STARTER", "PRO", "ENTERPRISE"],
            default: "STARTER",
        },

        billingCycle: {
            type: String,
            enum: ["monthly", "yearly"],
            default: "monthly",
        },

        status: {
            type: String,
            enum: ["active", "expired", "cancelled", "trial"],
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

        imageUploads: {
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

        phoneEncrypted: {
            type: String,
        },

        phoneHash: {
            type: String,
        },

        phoneLast4: {
            type: String,
        },
        appointmentPhoneEncrypted: { type: String },
        appointmentPhoneHash: { type: String },
        appointmentPhoneLast4: { type: String },

        address: {
            line1: { type: String, required: true },
            line2: String,
            line3: String,
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        regNumber: {
            type: String,
            required: true,
        },

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
