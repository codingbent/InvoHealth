const { type } = require('@testing-library/user-event/dist/type');
const mongoose=require('mongoose')
const {Schema} = mongoose;

const AppointmentSchema=new Schema({
    name:{
        type:String,
        require:true
    },
    amount:{
        type:Number
    },
    service:{
        type:Array
    },
    Date:{
        type:Date,
        default:Date.now
    }
}
)
const Appointment=mongoose.model('Appointment',AppointmentSchema)
module.exports=Appointment;