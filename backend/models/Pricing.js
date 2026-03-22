const mongoose = require("mongoose");
const { Schema } = mongoose;

const PlanSchema = new Schema(
    {
        monthly: {
            type: Number,
            required: true,
        },

        staffLimit: {
            type: Number,
            required: true,
        },

        excelLimit: {
            type: Number,
            required: true,
        },

        invoiceLimit: {
            type: Number,
            required: true,
        },

        analytics: {
            type: Boolean,
            default: false,
        },
        imageLimit: {
            type: Number,
            required: true,
        },
    },
    { _id: false },
);

const PricingSchema = new Schema({
    discount: {
        type: Number,
        default: 17,
    },

    starter: PlanSchema,
    pro: PlanSchema,
    enterprise: PlanSchema,

    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("Pricing", PricingSchema);
