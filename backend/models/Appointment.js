const mongoose = require("mongoose");
const { Schema } = mongoose;
const Counter = require("./Counter");

const AppointmentSchema = new Schema({
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
        unique: true,
    },
    visits: [
        {
            date: { type: Date, default: Date.now },
            service: [
                {
                    id: { type: Schema.Types.ObjectId, ref: "Service" },
                    name: String,
                    amount: Number,
                },
            ],
            amount: { type: Number, default: 0 },
            payment_type: {
                type: String,
                enum: ["Cash", "Card", "UPI", "Other"],
                default: "Cash",
            },
            invoiceNumber: { type: Number, default: null },
        },
    ],
});

// Pre-save middleware to assign invoiceNumber
AppointmentSchema.pre("save", async function (next) {
    if (this.isNew && this.visits.length > 0) {
        const counter = await Counter.findByIdAndUpdate(
            "invoiceNumber",
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.visits[0].invoiceNumber = counter.seq;
    }
    next();
});

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
