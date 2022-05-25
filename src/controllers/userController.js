const userModel = require("../models/userModel")
const aws = require("aws-sdk")
const bcrypt = require("bcryptjs")
const jwt =  require("jsonwebtoken")

const isValid = function(value){
    if(typeof value === 'undefined' || value === null) return false
    if(typeof value === 'string' && value.trim().length === 0) return false
    if(typeof value === 'number' && value.toString().trim().length === 0) return false
    return true
}

const isValidRequestBody = function(requestBody){
    return Object.keys(requestBody).length > 0
}

aws.config.update({
    accessKeyId: "AKIAY3L35MCRUJ6WPO6J",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile = async (file) => {

    return new Promise(function (resolve, reject) {
        // this function will upload file to aws and return the link
        let s3 = new aws.S3({ apiVersion: "2006-03-01" }); // we will be using the s3 service of aws

        var uploadParams = {
            ACL: "public-read",
            Bucket: "classroom-training-bucket", //HERE
            Key: "abc/" + file.originalname, //HERE
            Body: file.buffer,
        };

        s3.upload(uploadParams, function (err, data) {
        if (err) {
            return reject({ error: err });
        }
        console.log(data);
        console.log("file uploaded succesfully");
        return resolve(data.Location);
        });

        // let data= await s3.upload( uploadParams)
        // if( data) return data.Location
        // else return "there is an error"
    });
};


const register = async function(req,res){
    try
    {
        let requestBody =  req.body
        const saltRounds = 10
    
        //Validation Start
        if(!isValidRequestBody(requestBody)){
            return res.status(400).send({status:true, message:"Please enter details"})
        }

        //Extract Params
        const {fname, lname, email,  password, phone} = requestBody

        if(!isValid(fname)){
            return res.status(400).send({status:false, message:'First Name is required'})
        }

        if(!isValid(lname)){
            return res.status(400).send({status:false, message:'Last Name is required'})
        }

        if(!isValid(email)){
            return res.status(400).send({status:false, message:'Email is required'})
        }
        //check for valid mail
        if(!email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)){
            return res.status(400).send({status:false, message:'Invalid Mail'})
        }
        //check for unique mail
        const isEmailAlreadyUsed = await userModel.findOne({email})
        if(isEmailAlreadyUsed){
            return res.status(400).send({status:false, message:'This email is already registered'})
        }

        if(!isValid(password)){
            return res.status(400).send({status:false, message:'Password is required'})
        }
        //check for password length
        if(!(password.trim().length>=8 && password.trim().length<=15)){
            return res.status(400).send({status:false, message:'Password should have length in range 8 to 15'})
        }
        // Bcrypt password
        requestBody.password = await bcrypt.hash(password, saltRounds)
        
        if(!isValid(phone)){
            return res.status(400).send({status:false, message:'Phone no is required'})
        }
        //check for unique no
        const isNoAlreadyUsed = await userModel.findOne({phone})
        if(isNoAlreadyUsed){
            return res.status(400).send({status:false, message:'This no is Already registered'})
        }
        //check for valid no
        if(!(/^[6-9]\d{9}$/.test(phone))){
            return res.status(400).send({status:false, message:'Invalid no'})
        }

        let shipping = requestBody.address.shipping  

        if(!isValid(shipping.street)){
            return res.status(400).send({status:false, message:'Street is required'})
        }

        if(!isValid(shipping.city)){
            return res.status(400).send({status:false, message:'City is required'})
        }

        if(!isValid(shipping.pincode)){
            return res.status(400).send({status:false, message:'Pincode is required'})
        }

        let billing = requestBody.address.billing

        if(!isValid(billing.street)){
            return res.status(400).send({status:false, message:'Street is required'})
        }

        if(!isValid(billing.city)){
            return res.status(400).send({status:false, message:'City is required'})
        }

        if(!isValid(billing.pincode)){
            return res.status(400).send({status:false, message:'Pincode is required'})
        }
        //Validation End

        //File-cloud Data for storing image
        let files = req.files

        if (!(files && files.length > 0)){
            return res.status(400).send({ status: false, message: "No file found" });
        }
           
        let uploadedFileURL = await uploadFile(files[0]);

        requestBody.profileImage = uploadedFileURL;

        const registerUser = await userModel.create(requestBody)
        res.status(201).send({status:true, message:'Success', data:registerUser})
    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }
  
}

const login = async function(req,res){
    try
    {
        let requestBody =  req.body

        if(!(isValidRequestBody)){
            return res.status(400).send({status:false, message:'Please enter login Details'})
        }

        const {email, password} = requestBody

        if(!isValid(email)){
            return res.status(400).send({status:false, message:'Email is required'})
        }
        //check for valid mail
        if(!email.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/)){
            return res.status(400).send({status:false, message:'Invalid Mail'})
        }

        if(!isValid(password)){
            return res.status(400).send({status:false, message:'Password is required'})
        }
        //check for password length
        if(!(password.trim().length>=8 && password.trim().length<=15)){
            return res.status(400).send({status:false, message:'Password should have length in range 8 to 15'})
        }

        let user = await userModel.findOne({email})

        if(!user){
            return res.status(400).send({status:false, message:'Invalid email'})
        }

        let passwordInDb = user.password
        console.log(passwordInDb)  //return hashkey password
        let encryptPassword = await bcrypt.compare(password, passwordInDb)
        console.log(encryptPassword) // return true or false

        if(!encryptPassword){
            return res.status(400).send({status:false, message:'Password is Incorrect'})
        }      

        let userId = user._id

        let token = await jwt.sign(
            {
                userId : user._id.toString(),
                iat : Math.floor(Date.now()/1000),
                exp : Math.floor(Date.now()/1000) * 10 * 60 * 60
            },
            "Project-5"    
        )

        res.status(200).send({status:true,message:'User login successfull', data:{userId,token}})

    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }

}

module.exports = {register, login}