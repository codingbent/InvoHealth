const mongoose = require("mongoose");
const { Schema } = mongoose;

const PaymentSchema = new Schema(
    {
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: "Doc",
            required: true,
        },

        plan: {
            type: String,
            enum: ["FREE", "STARTER", "PRO", "ENTERPRISE"],
        },

        billingCycle: {
            type: String,
            enum: ["monthly", "yearly"],
        },

        amountPaid: Number,

        currency: {
            type: String,
            default: "INR",
        },

        paymentId: String,
        orderId: String,

        paidAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Payment", PaymentSchema);
