const mongoose = require("mongoose");
const { Schema } = mongoose;

const AppointmentSchema = new Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
    unique: true
  },
  visits: [
    {
      date: {
        type: Date,
        default: Date.now
      },
      service: [
        {
          type: String 
        }
      ],
      amount: {
        type: Number,
        default: 0
      }
    }
  ]
});

const Appointment = mongoose.model("Appointment", AppointmentSchema);
module.exports = Appointment;
