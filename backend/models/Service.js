const mongoose = require("mongoose");
const { Schema } = mongoose;

const ServiceSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: false,
        default: 0,
    },
    doctor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "doc", // reference to the Doc model
        required: true, // each service must have a doctor
    },
});

const Service = mongoose.model("service", ServiceSchema);
module.exports = Service;