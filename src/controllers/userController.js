const userModel = require("../models/userModel")
const aws = require("../utils/aws")
const bcrypt = require("bcryptjs")
const jwt =  require("jsonwebtoken")
const { default: mongoose } = require("mongoose")

const isValid = function(value){
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}

const isValidRequestBody = function(requestBody){
    return Object.keys(requestBody).length > 0
}

const isValidObjectId = function(ObjectId){
    return mongoose.Types.ObjectId.isValid(ObjectId)
}

//--------------------------------------CREATE USER-----------------------------------------------------------


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
        let {fname, lname, email,  password, phone, address} = requestBody

        if(!isValid(fname?.trim())){
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
            return res.status(400).send({status:false, message:'This phone No. is Already registered'})
        }
        //check for valid no
        if(!(/^[6-9]\d{9}$/.test(phone))){
            return res.status(400).send({status:false, message:'Invalid no'})
        }

        if(!isValid(address)){
            return res.status(400).send({status:false, message:'Address is required'})
        }

        // address = JSON.parse(address)

        let {shipping, billing} = address

        if(!isValid(shipping)){
            return res.status(400).send({status:false, message:'Shipping Address is required'})
        } 

        if(!isValid(shipping.street)){
            return res.status(400).send({status:false, message:'Shipping-Street is required'})
        }

        if(!isValid(shipping.city)){
            return res.status(400).send({status:false, message:'Shipping-City is required'})
        }

        if(!isValid(shipping.pincode)){
            return res.status(400).send({status:false, message:'Shipping-Pincode is required'})
        }
        if(!(/^[1-9]\d{5}$/.test(shipping.pincode))){
            return res.status(400).send({status:false, message:'Incorrect Shipping-pincode'})
        }

        if(!isValid(billing)){
            return res.status(400).send({status:false, message:'Billing Address is required'})
        }

        if(!isValid(billing.street)){
            return res.status(400).send({status:false, message:'Billing-Street is required'})
        }

        if(!isValid(billing.city)){
            return res.status(400).send({status:false, message:'Billing-City is required'})
        }

        if(!isValid(billing.pincode)){
            return res.status(400).send({status:false, message:'Billing-Pincode is required'})
        }
        if(!(/^[1-9]\d{5}$/.test(billing.pincode))){
            return res.status(400).send({status:false, message:'Incorrect Billing-pincode'})
        }
        //Validation End

        //File-cloud Data for storing image
        let files = req.files

        if (!(files && files.length > 0)){
            return res.status(400).send({ status: false, message: "No file found" });
        }
           
        let uploadedFileURL = await aws.uploadFile(files[0]);

        requestBody.profileImage = uploadedFileURL;

        let finalData = {fname, lname, email,  password, phone, address, profileImage :requestBody.profileImage}

        const registerUser = await userModel.create(finalData)
        res.status(201).send({status:true, message:'Success', data:registerUser})
    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }
  
}

//----------------------------------------LOGIN USER--------------------------------------------------------

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
            return res.status(404).send({status:false, message:'Invalid email'})
        }

        let passwordInDb = user.password
        // console.log(passwordInDb)  //return hashkey password
        let encryptPassword = await bcrypt.compare(password, passwordInDb)
        // console.log(encryptPassword) // return true or false

        if(!encryptPassword){
            return res.status(400).send({status:false, message:'Incorrect Password'})
        }      

        let userId = user._id

        let token = await jwt.sign(
            {
                userId : user._id.toString(),
                iat : Math.floor(Date.now()/1000),
                exp : Math.floor(Date.now()/1000) + 10 * 60 * 60
            },
            "Project-5"    
        )

        // res.setHeader("x-api-key",token)
        res.status(200).send({status:true,message:'User login successfull', data:{userId,token}})

    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }

}

//-----------------------------------------------GET PROFILE------------------------------------------------

const getProfile = async function(req,res)
{
    try
    {
        let paramsId = req.params.userId

        if(!isValidObjectId(paramsId)){
            return res.status(400).send({status:false, message:'Invalid params Id'})
        }

        let fetchProfile = await userModel.findById(paramsId)

        res.status(200).send({status:true, message:'User profile details', data:fetchProfile})

    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }
}

//----------------------------------------------UPDATE USER-------------------------------------------------

const updateProfile = async function(req,res)
{
    try
    {
        let paramsId = req.params.userId

        if(!isValidObjectId(paramsId)){
            return res.status(400).send({status:false, message:'Please enter valid Object Params Id'})
        }
 
        let user = await userModel.findById(paramsId)

        if(!user){
            return res.status(400).send({status:false, message:'This user is not found'})
        }

        //AUTHORIZATION
        //-->
        let tokenUserId = req.userId
        if(tokenUserId !== paramsId){
            return res.status(403).send({status:false, message:'you are not authorized'})
        }
        //<--

        let requestBody = req.body
        
        if(req.files.length)
        {
            let files = req.files
            let uploadedFileURL = await aws.uploadFile(files[0]);
            requestBody.profileImage = uploadedFileURL
        }

        if(!isValidRequestBody(requestBody)){
            return res.status(400).send({status:false, message:'Plese enter data for user update'})
        }

        //Extract Params
        let {fname, lname, email,  password, phone, address, profileImage} = requestBody

        //Validation Start

        if(fname){
            if(!isValid(fname)){
                return res.status(400).send({status:false, message:'Please enter Valid First Name'})
            }
        }

        if(lname){
            if(!isValid(lname)){
                return res.status(400).send({status:false, message:'Please Enter Valid Last Name'})
            }
        }

        if(email){
            if(!isValid(email)){
                return res.status(400).send({status:false, message:'Please Enter Valid Mail'})
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
        }

        if(password){
            if(!isValid(password)){
                return res.status(400).send({status:false, message:'Please enter Valid password'})
            }
            //check for password length
            if(!(password.trim().length>=8 && password.trim().length<=15)){
                return res.status(400).send({status:false, message:'Password should have length in range 8 to 15'})
            }
            // Bcrypt password
            requestBody.password = await bcrypt.hash(password, 10)
        }

        if(phone){
            if(!isValid(phone)){
                return res.status(400).send({status:false, message:'Pleasee Enter Valid phone no'})
            }
            // check for unique no
            const isNoAlreadyUsed = await userModel.findOne({phone})
            if(isNoAlreadyUsed){
                return res.status(400).send({status:false, message:'This no is Already registered'})
            }
            //check for valid no
            if(!(/^[6-9]\d{9}$/.test(phone))){
                return res.status(400).send({status:false, message:'Invalid no'})
            }
        }


        // Shipping Address 
        if (address) 
        {
            let shippingAddresstoString = JSON.stringify(address);
            let stringtoObject = JSON.parse(shippingAddresstoString);

            if (isValidRequestBody(stringtoObject)) {
                if (stringtoObject.hasOwnProperty('shipping')) {
                    if (stringtoObject.shipping.hasOwnProperty('street')) {
                        if (!isValid(stringtoObject.shipping.street)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide shipping address's Street" });
                        }
                    }
                    if (stringtoObject.shipping.hasOwnProperty('city')) {
                        if (!isValid(stringtoObject.shipping.city)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide shipping address's City" });
                        }
                    }
                    if (stringtoObject.shipping.hasOwnProperty('pincode')) {
                        if (!isValid(stringtoObject.shipping.pincode)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide shipping address's pincode" });
                        }
                    }

                    //using var to use these variables outside this If block.
                    var shippingStreet = address.shipping.street
                    var shippingCity = address.shipping.city
                    var shippingPincode = address.shipping.pincode
                }
            } else {
                return res.status(400).send({ status: false, message: " Invalid request parameters. Shipping address cannot be empty" });
            }
        }

        //For Billing Address

        if (address) 
        {
            //converting billing address to string them parsing it.
            let billingAddressToString = JSON.stringify(address)
            let parsedBillingAddress = JSON.parse(billingAddressToString)

            if (isValidRequestBody(parsedBillingAddress)) {
                if (parsedBillingAddress.hasOwnProperty('billing')) {
                    if (parsedBillingAddress.billing.hasOwnProperty('street')) {
                        if (!isValid(parsedBillingAddress.billing.street)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide billing address's Street" });
                        }
                    }
                    if (parsedBillingAddress.billing.hasOwnProperty('city')) {
                        if (!isValid(parsedBillingAddress.billing.city)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide billing address's City" });
                        }
                    }
                    if (parsedBillingAddress.billing.hasOwnProperty('pincode')) {
                        if (!isValid(parsedBillingAddress.billing.pincode)) {
                            return res.status(400).send({ status: false, message: " Invalid request parameters. Please provide billing address's pincode" });
                        }
                    }

                    //using var to use these variables outside this If block.
                    var billingStreet = address.billing.street
                    var billingCity = address.billing.city
                    var billingPincode = address.billing.pincode
                }
            } else {
                return res.status(400).send({ status: false, message: " Invalid request parameters. Billing address cannot be empty" });
            }
        }
        
        let updatedData = {fname, lname, email, password, phone, profileImage, 
        'address.shipping.street': shippingStreet,
        'address.shipping.city': shippingCity,
        'address.shipping.pincode': shippingPincode,
        'address.billing.street': billingStreet,
        'address.billing.city': billingCity,
        'address.billing.pincode': billingPincode}

        let updateUser = await userModel.findOneAndUpdate({_id:paramsId},updatedData,{new:true})

        res.status(200).send({status:true, message:'User profile updated', data:updateUser})

    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }
    
}

module.exports = {register, login, getProfile, updateProfile}