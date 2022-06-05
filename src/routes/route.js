const express = require('express')
const router = express.Router();
const userController = require("../controllers/userController")
const auth = require("../middleware/auth")
const productController = require("../controllers/productController");
const cartController = require("../controllers/cartController")
const orderController = require("../controllers/orderController")


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

//CART 
router.post("/users/:userId/cart", cartController.createCart)
router.put('/users/:userId/cart',auth.authentication,cartController.updateCart); 
router.get('/users/:userId/cart',auth.authentication,cartController.getCart); 
router.delete('/users/:userId/cart',auth.authentication,cartController.deleteCart);

// ORDER
router.post('/users/:userId/orders',auth.authentication,orderController.createOrder); 
router.put('/users/:userId/orders',auth.authentication,orderController.updateOrder);


module.exports = router;