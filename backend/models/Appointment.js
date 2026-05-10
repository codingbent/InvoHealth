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
            date: {
                type: String,
                required: true,
                match: /^\d{4}-\d{2}-\d{2}$/,
            },
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

            images: [
                {
                    url: { type: String },
                    type: { type: String },
                    public_id: { type: String },
                    resource_type: { type: String },
                },
            ],
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
    files = [],
) {
    const visitDate =
        typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
            ? date
            : new Date().toLocaleDateString("en-CA");

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
        images: files.map((f) => ({
            url: f.url,
            type: f.type,
            public_id: f.public_id,
            resource_type:
                f.resource_type ||
                (f.type === "application/pdf" ? "raw" : "image"),
        })),
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
AppointmentSchema.index({ patient: 1, doctor: 1 }, { unique: true });
AppointmentSchema.index({ doctor: 1, "visits.date": 1, "visits.time": 1 });

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
