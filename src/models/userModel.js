const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({

    fname : {type:String, required:true, trim:true},

    lname : {type:String, rquired:true, trim:true},

    email : {type:String, required:true, unique:true, lowercase:true, trim:true},

    profileImage : {type:String, required:true, trim:true},

    phone : {type:String, required:true, unique:true},

    password : {type:String, required:true, trim:true},

    address : {

        shipping : {
            street : {type:String, required:true, trim:true},
            city : {type:String, required:true, trim:true},
            pincode : {type:Number, required:true, trim:true}
        },
        billing : {            
            street : {type:String, required:true, trim:true},
            city : {type:String, required:true, trim:true},
            pincode : {type:Number, required:true, trim:true}
        }

    }

},{timestamps:true})

module.exports = mongoose.model("User", userSchema)