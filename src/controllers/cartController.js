

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

const createCart = async function(req,res){

    let requestBody = req.body

    if(!isValidRequestBody(requestBody)){
        return res.status(400).send({status:false, message:'Please enter some details for cart'})
    }

    const {userId, items} = requestBody

    if(!isValidObjectId(userId)){
        return res.status(400).send({status:false, message:'valid userId is required'})
    }

    if(bh){

    }



}