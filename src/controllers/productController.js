const mongoose = require('mongoose')
const productModel = require("../models/productModel");
const aws = require("../utils/aws")


const isValid = function(value){
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    if (typeof value === 'number' && value.toString().trim().length === 0 ) return false 
    return true;
}

const isValidRequestBody = function(requestBody){
    return Object.keys(requestBody).length > 0
}

const isValidObjectId = function(ObjectId){
    return mongoose.Types.ObjectId.isValid(ObjectId)
}

//----------------------------------------------CREATE PRODUCT-----------------------------------------

const createProduct = async function(req,res)
{
    try
    {
        const requestBody = req.body

        //Validation Start
        if(!isValidRequestBody(requestBody)){
            return res.status(400).send({status:false, message:'Body Data is required'})
        }

        //Extract params
        const {title, description, price, currencyId, currencyFormat, availableSizes} = requestBody

        if(!isValid(title)){
            return res.status(400).send({status:false, message:'Title is required'})
        }
        //Check for unique title
        const isTitleAlreadyExist = await productModel.findOne({title})
        if(isTitleAlreadyExist){
            return res.status(400).send({status:false, message:'This Title is already Exist'})
        }

        if(!isValid(description)){
            return res.status(400).send({status:false, message:'Description is required'})
        }

        if(!isValid(price)){
            return res.status(400).send({status:false, message:'Price is required'})
        }
        //Check for valid number/decimal
        if(!(/^\d{0,8}[.]?\d{1,4}$/.test(price))){
            return res.status(400).send({status:false, message:'Invalid price'})
        }

        if(!isValid(currencyId)){
            return res.status(400).send({status:false, message:'CurrencyId is required'})
        }
        //Check for INR
        if(currencyId !== "INR"){
            return res.status(400).send({status:false, message:'only accepted INR'})
        }

        if(!isValid(currencyFormat)){
            return res.status(400).send({status:false, message:'CurrencyFormat is required'})
        } 
        //check for symbol ->
        if(currencyFormat !==  "₹"){
            return res.status(400).send({status:false, message:'Only accepted ₹ this currency symbol'})
        }

        if(!isValid(availableSizes)){
            return res.status(400).send({status:false, message:'AvailableSizes is required'})
        }
        //check for enum ["S", "XS", "M", "X", "L", "XXL", "XL"]
        if(availableSizes){
            // console.log(availableSizes)
            let array = availableSizes.split(",").map(x=>x.toUpperCase().trim())
            // console.log(array)
            // console.log(typeof array)
            for(let i=0; i<array.length; i++){
            //console.log(array[i])
                if(!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))){
                    return res.status(400).send({status:false, message:'Sizes only available from ["S", "XS", "M", "X", "L", "XXL", "XL"]'})
                }
            }
            if(Array.isArray(array)){
            requestBody.availableSizes = array
            // console.log(array)
            // console.log(requestBody.availableSizes)
            }         
        }
      
        //File-cloud Data for storing image
        let files = req.files

        if (!(files && files.length > 0)){
            return res.status(400).send({ status: false, message: "No file found" });
        }
           
        let uploadedFileURL = await aws.uploadFile(files[0]);

        requestBody.productImage = uploadedFileURL;
        
        const product = await productModel.create(requestBody)
        res.status(201).send({status:true,message:'Product created successfullt', data:product})

    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }

}

//---------------------------------------------GET PRODUCT BY QUERY-------------------------------------------

const getProductsByQuery = async function(req,res)
{
    try
    {
        const filterQuery = {isDeleted:false}

        const queryParams = req.query

        //VALIDATION START
        if(isValidRequestBody(queryParams))
        {
            var {size, name, priceGreaterThan, priceLessThan, priceSort} = queryParams

            if(isValid(size)){
                filterQuery['availableSizes'] = size
            }

            if(isValid(name)){
                filterQuery['title'] = {}
                filterQuery['title']['$regex'] = name
                filterQuery['title']['$options'] = 'i'
            }

            //setting price for ranging the product's price to fetch them.
            if(isValid(priceGreaterThan))
            {
                if (!(!isNaN(Number(priceGreaterThan)))) 
                {                    
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (priceGreaterThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceGreaterThan should be a valid number` })
                }
                if (!filterQuery.hasOwnProperty('price'))
                    filterQuery['price'] = {}
                    filterQuery['price']['$gte'] = Number(priceGreaterThan)
                //console.log(typeof Number(priceGreaterThan))
            }

            //setting price for ranging the product's price to fetch them.
            if(isValid(priceLessThan))
            {
                if (!(!isNaN(Number(priceLessThan)))) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (priceLessThan <= 0) {
                    return res.status(400).send({ status: false, message: `priceLessThan should be a valid number` })
                }
                if (!filterQuery.hasOwnProperty('price')){
                    filterQuery['price'] = {}
                    filterQuery['price']['$lte'] = Number(priceLessThan)
                    // console.log(typeof Number(priceLessThan))
                }    
            }

            //sorting the products acc. to prices => 1 for ascending & -1 for descending.
            if (isValid(priceSort)) 
            { 
                if (!((priceSort == 1) || (priceSort == -1)))
                {
                    return res.status(400).send({ status: false, message: `priceSort should be 1 or -1 ` })
                }
            }  
        }

        let products = await productModel.find(filterQuery).sort({ price:priceSort })

        if(!isValidRequestBody(products)){
            return res.status(400).send({status:false, message:'No product Found'})
        }

        res.status(200).send({status:true, message:'Find by query Documnents', data:products})

    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }
}

//-----------------------------------------------GET PRODUCT BY ID-------------------------------------------

const getProductById = async function(req,res){
    try
    {
        const paramsId = req.params.productId

        if(!isValidObjectId(paramsId)){
            return res.status(400).send({status:false, message:'Params Id is invalid'})
        }
    
        const product = await productModel.findById(paramsId)
    
        if(!product){
            return res.status(404).send({status:false, message:'Product not found'})
        }
    
        if(product.isDeleted){
            return res.status(400).send({status:false, message:'This Product is deleted'})
        }
    
        res.status(200).send({status:true, message:'Success', data:product})

    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }

}

//---------------------------------------------UPDATE PRODUCT-------------------------------------------------

const updateProduct = async function(req,res)
{
    try
    {
        const paramsId = req.params.productId

        let findProduct = await productModel.findById(paramsId)

        if(!findProduct || findProduct.isDeleted){
            return res.status(404).send({status:false, message:'Product not Exist or maybe deleted'})
        }
        // res.status(200).send({status:false, message:'Success', data:findProduct})

        let requestBody = req.body

        if(req.files.length){
            let files = req.files
            let uploadedFileURL = await aws.uploadFile(files[0])
            requestBody.productImage = uploadedFileURL
        }

        //VALIDATION START
        if(!isValidRequestBody(requestBody)){
            return res.status(400).send({status:false, message:"Please enter atleast one key for updation"})
        }

        const {title, description, price, currencyId, currencyFormat, availableSizes} = requestBody

        if(title){
            if(!isValid(title)){
                return res.status(400).send({status:false, message:'Title is required'})
            }
            //Check for unique title
            const isTitleAlreadyExist = await productModel.findOne({title})
            if(isTitleAlreadyExist){
                return res.status(400).send({status:false, message:'This Title is already Exist'})
            }
        }

        if(description){
            if(!isValid(description)){
                return res.status(400).send({status:false, message:'Description is required'})
            }
        }

        if(price){
            if(!isValid(price)){
                return res.status(400).send({status:false, message:'Price is required'})
            }
            //Check for valid number/decimal
            if(!(/^\d{0,8}[.]?\d{1,4}$/.test(price))){
                return res.status(400).send({status:false, message:'Invalid price'})
            }
        }

        if(currencyId){
            if(!isValid(currencyId)){
                return res.status(400).send({status:false, message:'CurrencyId is required'})
            }
            //Check for -> INR
            if(currencyId !== "INR"){
                return res.status(400).send({status:false, message:'only accepted INR'})
            }           
        }

        if(currencyFormat){
            if(!isValid(currencyFormat)){
                return res.status(400).send({status:false, message:'CurrencyFormat is required'})
            } 
            //check for symbol -> ₹
            if(currencyFormat !==  "₹"){
                return res.status(400).send({status:false, message:'Only accepted ₹ this currency symbol'})
            }
        }

        if(availableSizes){
            if(!isValid(availableSizes)){
                return res.status(400).send({status:false, message:'AvailableSizes is required'})
            }
            let array = availableSizes.split(",").map(x=>x.toUpperCase().trim())
            for(let i=0; i<array.length; i++){
                if(!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(array[i]))){
                    return res.status(400).send({status:false, message:'Sizes only available from ["S", "XS", "M", "X", "L", "XXL", "XL"]'})
                }
            }
            if(Array.isArray(array)){
            requestBody.availableSizes = array
            }         
        }
        //VALIDATION END

        let updateData = await productModel.findOneAndUpdate({_id:findProduct}, requestBody, {new:true})

        res.status(200).send({status:true, message:'Product Updated Successfully', data:updateData})


    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false, Error:err.message})
    }

}

//----------------------------------------------DELETE PRODUCT-----------------------------------------------

const deleteProduct = async function(req,res){

    const paramsId = req.params.productId

    if(!isValidObjectId(paramsId)){
        return res.status(400).send({status:false, message:'params id is not valid'})
    }

    const findProduct = await productModel.findById(paramsId)

    if(!findProduct){
        return res.status(404).send({status:false, message:'This prouct is not exist'})
    }

    if(findProduct.isDeleted){
        return res.status(400).send({status:false, message:'This product is already deleted'})
    }

    let deleteData = await productModel.findByIdAndUpdate({_id:paramsId}, {isDeleted:true, deletedAt:Date.now()}, {new:true})

    res.status(200).send({status:false, message:'Data deleted Successfully'})

}



module.exports = {createProduct, getProductsByQuery, getProductById, updateProduct, deleteProduct}