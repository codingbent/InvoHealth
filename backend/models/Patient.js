const { type } = require('@testing-library/user-event/dist/type');
const mongoose = require('mongoose');
const { data } = require('react-router');
const { Schema } = mongoose;

const PatientSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    service: {
        type: Array,
        default: null
    },
    number: {
        type: String,
        default: "0000000000"
    },
    amount: {
        type: Number,
        default: 0
    },
    date:{
        type:Date,
        default:Date.now
    }
});

const Patient = mongoose.model('Patient', PatientSchema);
module.exports = Patient;
