const mongoose=require('mongoose')
const {Schema} = mongoose;

const AppointmentSchema=new Schema({
    name:{
        type:String,
        require:true
    },
    Date:{
        type:Date,
        default:Date.now
    }
}
)
const Appointment=mongoose.model('Appointment',AppointmentSchema)
module.exports=Appointment;