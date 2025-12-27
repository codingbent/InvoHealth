const mongoose = require("mongoose");
const { Schema } = mongoose;

const ServiceSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            default: 0,
        },
        doctor: {
            type: Schema.Types.ObjectId,
            ref: "Doc",
            required: true,
        },
    },
    { timestamps: true }
);

ServiceSchema.index({ doctor: 1 });

module.exports = mongoose.model("Service", ServiceSchema);
