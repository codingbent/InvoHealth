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
        ref: "doc", 
        required: true, 
    },
});

const Service = mongoose.model("service", ServiceSchema);
module.exports = Service;