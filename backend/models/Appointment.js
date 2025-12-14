const mongoose = require("mongoose");
const { Schema } = mongoose;
const Counter = require("./Counter");

const AppointmentSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
        unique: true,
    },
    doctor: { type: Schema.Types.ObjectId, ref: "Doc", required: true }, // track doctor
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

            // 🆕 DISCOUNT FIELDS
            discount: { type: Number, default: 0 }, // discount value
            isPercent: { type: Boolean, default: false }, // true = percentage, false = fixed

            payment_type: {
                type: String,
                enum: ["Cash", "Card", "UPI","ICICI","HDFC", "Other"],
                default: "Cash",
            },
            invoiceNumber: { type: Number, default: 1 },
        },
    ],
});

// Helper to get next invoice number for a doctor
async function getNextInvoiceNumber(doctorId) {
    const counter = await Counter.findOneAndUpdate(
        { _id: `invoice_${doctorId}` },
        { $inc: { seq: 0 } },
        { new: true }
    );

    if (!counter) {
        // Create the counter first with seq = 1
        const newCounter = await Counter.create({
            _id: `invoice_${doctorId}`,
            seq: 1,
        });
        return newCounter.seq;
    }

    return counter.seq;
}

// Static method to add visit
AppointmentSchema.statics.addVisit = async function (
    patientId,
    doctorId,
    service,
    amount,
    payment_type,
    invoiceNumber,
    date
) {
    // Parse date safely
    let visitDate = new Date();
    if (date && !isNaN(Date.parse(date))) {
        visitDate = new Date(date);
    }

    const newVisit = {
        date: visitDate,
        service,
        amount,
        payment_type,
        invoiceNumber,
    };

    const appointment = await this.findOneAndUpdate(
        { patient: patientId },
        {
            $push: { visits: newVisit },
            $set: { doctor: doctorId },
        },
        { upsert: true, new: true }
    );

    return appointment;
};

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
