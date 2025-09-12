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

// Pre-save middleware: assign invoiceNumber for **new Appointment**
AppointmentSchema.pre("save", async function (next) {
    if (this.isNew && this.visits.length > 0) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                "invoiceNumber",
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.visits[0].invoiceNumber = counter.seq;
        } catch (err) {
            console.error("Error assigning invoice number:", err);
            return next(err);
        }
    }
    next();
});

// Static method to add a visit to existing appointment
AppointmentSchema.statics.addVisit = async function (
    patientId,
    service,
    amount,
    payment_type
) {
    // Convert current time to IST
    const now = new Date();
    const istOffset = 5.5 * 60; // IST in minutes
    const istDate = new Date(now.getTime() + istOffset * 60000);

    // Get next invoice number
    const counter = await Counter.findByIdAndUpdate(
        "invoiceNumber",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );

    const newVisit = {
        date: istDate,
        service,
        amount,
        payment_type,
        invoiceNumber: counter.seq,
    };

    // Add visit to existing appointment (or create if not exists)
    const appointment = await this.findOneAndUpdate(
        { patient: patientId },
        { $push: { visits: newVisit } },
        { upsert: true, new: true }
    );

    return appointment;
};

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
