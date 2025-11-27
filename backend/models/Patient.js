const mongoose = require("mongoose");
const { Schema } = mongoose;

const PatientSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    service: [
        {
            id: { type: Schema.Types.ObjectId, ref: "service" },
            name: String,
            amount: Number,
        },
    ],
    number: {
        type: String,
        default: "0000000000",
        required: false,
        minlength: 10,
        maxlength: 10,
        validate: {
            validator: function (v) {
                // Allow empty string, but if not empty, must be 10 digits
                return !v || /^\d{10}$/.test(v);
            },
            message: (props) =>
                `${props.value} is not a valid 10-digit number!`,
        },
    },
    amount: {
        type: Number,
        default: 0,
    },
    age: {
        type: Number,
        required: false,
    },
    gender:{
        type:String,
        enum: ["Male", "Female", "Other"],
        required:false
    },
    date: {
        type: Date,
        default: Date.now,
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: "doc",
        required: true,
    },
});

const Patient = mongoose.model("Patient", PatientSchema);
module.exports = Patient;
