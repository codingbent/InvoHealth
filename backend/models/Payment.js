const mongoose = require("mongoose");
const { Schema } = mongoose;

const PaymentSchema = new Schema(
    {
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: "Doc",
            required: true,
            index: true,
        },

        plan: {
            type: String,
            enum: ["STARTER", "PRO", "ENTERPRISE"],
            required: true,
        },

        billingCycle: {
            type: String,
            enum: ["monthly", "yearly"],
            required: true,
        },

        amountPaid: {
            type: Number,
            required: true,
        },

        currency: {
            type: String,
            default: "INR",
        },

        // ── Razorpay fields ──
        paymentId: {
            type: String,
            index: true,
            sparse: true,
            unique: true,
        },

        orderId: {
            type: String,
            sparse: true,
        },

        // ── PayPal / shared subscription ID ──
        subscriptionId: {
            type: String,
            index: true,
            sparse: true,
        },

        // ── Status ──
        status: {
            type: String,
            enum: ["success", "failed", "pending", "refunded"],
            default: "pending",
            index: true,
        },

        paymentMethod: {
            type: String,
            enum: ["razorpay", "paypal"],
            required: true,
            index: true,
        },

        // ── Webhook tracking (prevents duplicate processing) ──
        webhookEventId: {
            type: String,
            sparse: true,
            index: true,
        },

        // ── Metadata ──
        metadata: {
            type: Schema.Types.Mixed,
        },

        paidAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true },
);

// Compound index: prevents duplicate webhook events from creating duplicate records
PaymentSchema.index(
    { subscriptionId: 1, webhookEventId: 1 },
    { unique: true, sparse: true },
);

module.exports = mongoose.model("Payment", PaymentSchema);
