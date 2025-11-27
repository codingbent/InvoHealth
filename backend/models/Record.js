const mongoose = require("mongoose");
const { Schema } = mongoose;

const RecordSchema = new Schema(
    {
        doctor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doc",
            required: true,
            unique: true,
        },
        patients: [
            {
                patientId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Patient",
                    required: true,
                },
                name: {
                    type: String,
                    required: true,
                },
                service: {
                    type: String,
                },
                lastVisit: {
                    type: Date,
                    default: null,
                },
                amount: {
                    type: Number,
                    default: 0,
                },
            },
        ],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Record", RecordSchema);
