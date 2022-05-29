const jwt = require("jsonwebtoken")


const authentication = async function(req,res,next)
{
    try
    {
        let token = req.headers['authorization']

        // if no token found
        if (typeof token=='undefined') {
            return res.status(400).send({status: false,message: "Token required! Please login to generate token"});
        }    

        let bearer = token.split(" ")
        let bearerToken = bearer[1]

        jwt.verify(bearerToken, "Project-5", { ignoreExpiration: true },function (error, decodedToken) {
            // if token is invalid
            if (error) {
                return res.status(400).send({status: false,message: "Token is invalid"});
            }    
            // if token is valid
            else {
                // if token expired
                if (Date.now() > decodedToken.exp * 1000) {
                    return res.status(401).send({status: false,message: "Session Expired"});
                }
                req.userId = decodedToken.userId;
                // console.log(req.userId)
                // console.log(decodedToken.userId)
                next();
            }
        })   
    }
    catch(err)
    {
        console.log(err.message)
        res.status(500).send({status:false,Error:err.message})
    }

}

module.exports = {authentication}



