const mongoose=require('mongoose');
const { Schema } =mongoose;

const DocSchema = new Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    }
});

const Doc=mongoose.model('doc',DocSchema);
module.exports=Doc;