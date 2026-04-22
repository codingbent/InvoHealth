// models/Doc.js

"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

// ── Subscription sub-document ──
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
            enum: [
                "active",
                "expired",
                "cancelled",
                "trial",
                "pending",
                "failed",
                "none"
            ],
            default: "none",
        },

        startDate: {
            type: Date,
            default: Date.now,
        },

        expiryDate: { type: Date },

        // Razorpay fields
        paymentId: String,
        orderId: String,
        customerId: String, // Razorpay customer ID (reused across subscriptions)

        // PayPal / shared
        subscriptionId: String,

        // Payment details
        amountPaid: { type: Number },

        currency: { type: String }, // "INR", "USD", "GBP", "CAD" etc.

        currencyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Country",
        },

        exchangeRate: { type: Number },
        baseAmount: { type: Number },

        paymentMethod: {
            type: String,
            enum: ["razorpay", "paypal"],
        },

        // Doctor-defined offline payment methods (unrelated to subscription billing)
        paymentMethods: [
            {
                categoryId: {
                    type: Schema.Types.ObjectId,
                    ref: "PaymentCategory",
                    required: true,
                },
                subCategoryId: {
                    type: Schema.Types.ObjectId,
                    ref: "PaymentSubCategory",
                    required: true,
                },
                paymentType: {
                    type: String,
                    enum: ["online", "offline", "hybrid"],
                    default: "offline",
                },
                details: { type: String },
                label: { type: String },
                isActive: { type: Boolean, default: true },
            },
        ],
    },
    { _id: false },
);

// ── Usage sub-document ──
const UsageSchema = new Schema(
    {
        excelExports: { type: Number, default: 0 },
        invoiceDownloads: { type: Number, default: 0 },
        imageUploads: { type: Number, default: 0 },
    },
    { _id: false },
);

// ── Main Doctor schema ──
const DocSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        clinicName: { type: String, required: true },

        phoneEncrypted: { type: String },
        phoneHash: { type: String },
        phoneLast4: { type: String },

        appointmentPhoneEncrypted: { type: String },
        appointmentPhoneHash: { type: String },
        appointmentPhoneLast4: { type: String },

        paymentMethods: [
            {
                categoryId: {
                    type: Schema.Types.ObjectId,
                    ref: "PaymentCategory",
                    required: true,
                },
                subCategoryId: {
                    type: Schema.Types.ObjectId,
                    ref: "PaymentSubCategory",
                    required: true,
                },
                label: { type: String },
                isActive: { type: Boolean, default: true },
            },
        ],

        address: {
            line1: { type: String, required: true },
            line2: String,
            line3: String,
            city: { type: String, required: true },
            state: { type: String, required: true },
            countryId: {
                type: Schema.Types.ObjectId,
                ref: "Country",
                required: true,
            },
            countryCode: { type: String, required: true },
            pincode: { type: String, required: true },
        },

        regNumber: { type: String, required: true },
        experience: { type: Number, required: true },
        degree: { type: [String], required: true },

        role: { type: String, default: "doctor", enum: ["doctor"] },
        staff: [{ type: Schema.Types.ObjectId, ref: "Staff" }],

        subscription: SubscriptionSchema,
        usage: UsageSchema,
    },
    { timestamps: true },
);

module.exports = mongoose.model("Doc", DocSchema);
