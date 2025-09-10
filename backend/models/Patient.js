const mongoose = require('mongoose');
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
    age:{
        type:Number,
        required:false
    },
    date:{
        type:Date,
        default:Date.now
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: 'doc',
        required: true
    }
});

const Patient = mongoose.model('Patient', PatientSchema);
module.exports = Patient;
