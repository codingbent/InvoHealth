const mongoose = require('mongoose');
const { Schema } = mongoose;

const PatientSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    service: {
        type: String,
        default: null
    },
    number: {
        type: String,
        default: "0000000000"
    },
    amount: {
        type: Number,
        default: 0
    }
});

const Patient = mongoose.model('Patient', PatientSchema);
module.exports = Patient;
