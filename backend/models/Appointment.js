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
    doctor: { type: Schema.Types.ObjectId, ref: "Doc", required: true },
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
            discount: { type: Number, default: 0 },
            isPercent: { type: Boolean, default: false },
            collected: { type: Number, default: 0 },
            remaining: { type: Number, default: 0 },

            status: {
                type: String,
                enum: ["Paid", "Partial", "Unpaid"],
                default: "Unpaid",
            },
            payment_type: {
                type: String,
                enum: ["Cash", "Card", "SBI", "ICICI", "HDFC", "Other"],
                default: "Cash",
            },
            invoiceNumber: { type: Number, default: 1 },
        },
    ],
});

async function getNextInvoiceNumber(doctorId) {
    const counter = await Counter.findOneAndUpdate(
        { _id: `invoice_${doctorId}` },
        { $inc: { seq: 1 } },
        { new: true },
    );

    if (!counter) {
        const newCounter = await Counter.create({
            _id: `invoice_${doctorId}`,
            seq: 1,
        });
        return newCounter.seq;
    }

    return counter.seq;
}

AppointmentSchema.statics.addVisit = async function (
    patientId,
    doctorId,
    service,
    amount,
    payment_type,
    invoiceNumber,
    date,
    collectedInput,
) {
    // 1️⃣ Safe date parsing
    let visitDate = new Date();
    if (date && !isNaN(Date.parse(date))) {
        visitDate = new Date(date);
    }

    const finalAmount = Number(amount) || 0;

    // 2️⃣ Safe collected calculation
    let collected = Number(collectedInput);

    if (isNaN(collected)) {
        collected = finalAmount;
    }

    if (collected < 0) collected = 0;
    if (collected > finalAmount) collected = finalAmount;

    // 3️⃣ Remaining
    const remaining = Math.max(finalAmount - collected, 0);

    // 4️⃣ Status logic
    const status =
        remaining === 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

    const newVisit = {
        date: visitDate,
        service,
        amount: finalAmount,
        collected,
        remaining,
        status,
        payment_type,
        invoiceNumber,
    };

    const appointment = await this.findOneAndUpdate(
        { patient: patientId },
        {
            $push: { visits: newVisit },
            $set: { doctor: doctorId },
        },
        { upsert: true, new: true },
    );

    return appointment;
};

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
