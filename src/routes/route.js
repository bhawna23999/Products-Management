const express = require('express')
const router = express.Router();
const userController = require("../controllers/userController")
const auth = require("../middleware/auth")
const productController = require("../controllers/productController");
const { route } = require('express/lib/application');


//USER
router.post("/register", userController.register)
router.post("/login", userController.login)
router.get("/user/:userId/profile",auth.authentication,userController.getProfile)
router.put("/user/:userId/profile",auth.authentication,userController.updateProfile)

//PRDUCT
router.post("/products",productController.createProduct)
router.get("/products", productController.getProductsByQuery)
router.get("/products/:productId", productController.getProductById)
router.put("/products/:productId", productController.updateProduct)
router.delete("/products/:productId",productController.deleteProduct)


module.exports = router;