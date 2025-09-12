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

// Pre-save middleware: assign invoiceNumber only if missing
AppointmentSchema.pre("save", async function (next) {
    try {
        if (this.visits && this.visits.length > 0) {
            for (let visit of this.visits) {
                if (!visit.invoiceNumber) {
                    const counter = await Counter.findByIdAndUpdate(
                        "invoiceNumber",
                        { $inc: { seq: 1 } },
                        { new: true, upsert: true }
                    );
                    visit.invoiceNumber = counter.seq;
                }
            }
        }
        next();
    } catch (err) {
        console.error("Error assigning invoice number:", err);
        next(err);
    }
});

// Static method to add a new visit
AppointmentSchema.statics.addVisit = async function (
    patientId,
    service,
    amount,
    payment_type
) {
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

    // Add visit to existing appointment (or create new appointment if not exists)
    const appointment = await this.findOneAndUpdate(
        { patient: patientId },
        { $push: { visits: newVisit } },
        { upsert: true, new: true }
    );

    return appointment;
};

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
