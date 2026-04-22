const mongoose = require("mongoose");

const CountrySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    dialCode:{
        type: String,
        required:true,
    },
    symbol: {
        type: String,
        required: true,
    },
    rate: {
        type: Number,
        required: true,
    },
    multiplier: {
        type: Number,
        default: 1,
    },
    active: {
        type: Boolean,
        default: true,
    },
});

module.exports = mongoose.model("Country", CountrySchema);
