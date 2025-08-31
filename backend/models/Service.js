const mongoose = require('mongoose');
const { Schema } = mongoose;

const Serviceschema= new Schema({
    name:{
        type:String,
        required:true
    },
    amount:{
        type:Number,
        required:false
    }
})

const Service=mongoose.model('service',Serviceschema)
module.exports=Service;