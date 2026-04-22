const mongoose = require("mongoose");
const { Schema } = mongoose;

const slotSchema = new Schema({
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    slotDuration: { type: Number, required: true },
});

const dayAvailabilitySchema = new Schema({
    day: {
        type: String,
        enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        required: true,
    },
    slots: [slotSchema],
});

const TimingSchema = new Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doc",
            required: true,
            unique: true,
        },
        availability: [dayAvailabilitySchema],
    },
    { timestamps: true },
);

module.exports = mongoose.model("Timing", TimingSchema);
