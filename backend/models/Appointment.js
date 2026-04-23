const mongoose = require("mongoose");
const { Schema } = mongoose;

const AppointmentSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: "Patient",
        required: true,
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: "Doc",
        required: true,
    },
    visits: [
        {
            date: { type: Date, default: Date.now },
            time: { type: String },

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

            paymentMethodId: {
                type: Schema.Types.ObjectId,
                ref: "PaymentSubCategory",
                default: null,
            },

            invoiceNumber: { type: Number, default: 1 },

            image: {
                type: String,
                default: "",
            },
        },
    ],
});

AppointmentSchema.statics.addVisit = async function (
    patientId,
    doctorId,
    service,
    amount,
    paymentMethodId,
    invoiceNumber,
    date,
    collectedInput,
) {
    let visitDate = new Date();
    if (date && !isNaN(Date.parse(date))) {
        visitDate = new Date(date);
    }

    const finalAmount = Number(amount) || 0;

    let collected = Number(collectedInput);
    if (isNaN(collected)) collected = finalAmount;

    if (collected < 0) collected = 0;
    if (collected > finalAmount) collected = finalAmount;

    const remaining = Math.max(finalAmount - collected, 0);

    const status =
        remaining === 0 ? "Paid" : collected > 0 ? "Partial" : "Unpaid";

    const newVisit = {
        date: visitDate,
        service,
        amount: finalAmount,
        collected,
        remaining,
        status,
        paymentMethodId: paymentMethodId || null,
        invoiceNumber,
    };

    return await this.findOneAndUpdate(
        { patient: patientId, doctor: doctorId },
        {
            $push: { visits: newVisit },
            $set: { doctor: doctorId },
        },
        { upsert: true, new: true },
    );
};

AppointmentSchema.index({ doctor: 1, "visits.paymentMethodId": 1 });

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
