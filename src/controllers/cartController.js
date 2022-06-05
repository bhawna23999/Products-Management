const mongoose = require('mongoose')
const cartModel = require("../models/cartModel")
const userModel = require("../models/userModel")

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

//--------------------------------------------------CREATECART-----------------------------------------------

const createCart = async function (req, res) {
  try {
      const requestBody = req.body;
      var {items} = requestBody;
      let userId = req.params.userId;

      // validation starts
      if (!isValidRequestBody(requestBody)) {
          return res.status(400).send({ status: false, message: 'Invalid request body. Please provide the the input to proceed' })
      };

      if (!isValidObjectId(userId)) {
          return res.status(400).send({ status: false, message: 'UserId id is invalid' })
      };
      
      const { quantity, productId } = items
      // console.log(Object.keys(items))
      if (!isValidObjectId(productId)) {
          return res.status(400).send({ status: false, message: 'Product id Id is invalid' }) 
      };
      //validation end

      // find product
      const findProductData = await productModel.findOne({ _id: productId })
      if (!findProductData) {
          return res.status(400).send({ status: false, message: "Product not found." });
      };

      // find cart related to User
      const findCartData = await cartModel.findOne({ userId: userId });

      if (!findCartData) {

          //destructuring for the response body.
          var cartData = {
              userId: userId,
              items: [{
                  productId: productId,
                  quantity: quantity,
              }],
              totalPrice: findProductData.price * quantity,
              totalItems: 1
          }
          const createCart = await cartModel.create(cartData);
          res.status(201).send({ status: true, message: 'Cart created successfully', data: createCart });
      };

      if (findCartData) 
      {
          //updating price when products get added or removed.
          let price = findCartData.totalPrice + (items.quantity * findProductData.price)
          let itemsArr = findCartData.items

          //updating quantity.
          for (i in itemsArr) {
              if (itemsArr[i].productId.toString() === productId) {
                  itemsArr[i].quantity += quantity

                  let updatedCart = { items: itemsArr, totalPrice: price, totalItems: itemsArr.length }

                  let responseData = await cartModel.findOneAndUpdate({ _id: findCartData._id }, updatedCart, { new: true })

                  return res.status(200).send({ status: true, message: `Product added successfully`, data: responseData })
              }
          }
          itemsArr.push({ productId: productId, quantity: quantity }) //storing the updated prices and quantity to the newly created array.

          let updatedCart = { items: itemsArr, totalPrice:  findCartData.totalPrice + (items.quantity * findProductData.price), totalItems: itemsArr.length }
          let responseData = await cartModel.findOneAndUpdate({ _id: findCartData._id }, updatedCart, { new: true })

          return res.status(200).send({ status: true, message: `Product added successfully`, data: responseData })
      }
  } catch (err) {
      return res.status(500).send({ status: false, message: err.message });
  }
};

// -----------------------------------------------------UPDATE CART------------------------------------------

const updateCart = async function (req, res) {
  try {
      let requestBody = req.body;
      let userId = req.params.userId

      //validation starts.
      if (!isValidObjectId(userId)) {
          return res.status(400).send({ status: false, message: "Invalid userId in body" })
      }

      //Extract body
      const { cartId, productId, removeProduct } = requestBody
      if (!isValidRequestBody(requestBody)) {
          return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide cart details.' })
      }

      //cart validation
      if (!isValidObjectId(cartId)) {
          return res.status(400).send({ status: false, message: "Invalid cartId in body" })
      }
      let findCart = await cartModel.findById({ _id: cartId })
      if (!findCart) {
          return res.status(400).send({ status: false, message: "cartId does not exists" })
      }

      //product validation
      if (!isValidObjectId(productId)) {
          return res.status(400).send({ status: false, message: "Invalid productId in body" })
      }
      let findProduct = await productModel.findOne({ _id: productId, isDeleted: false })
      // if (!findProduct) {
      //     return res.status(400).send({ status: false, message: "productId does not exists" })
      // }

      //finding if products exits in cart
      let isProductinCart = await cartModel.findOne({ items: { $elemMatch: { productId: productId } } })
      if (!isProductinCart) {
          return res.status(400).send({ status: false, message: `This ${productId} product does not exists in the cart` })
      }

      //removeProduct validation either 0 or 1.
      if (!(!isNaN(Number(removeProduct)))) {
          return res.status(400).send({ status: false, message: `removeProduct should be a valid number either 0 or 1` })
      }

      //removeProduct => 0 for product remove completely, 1 for decreasing its quantity.
      if (!((removeProduct === 0) || (removeProduct === 1))) {
          return res.status(400).send({ status: false, message: 'removeProduct should be 0 (product is to be removed) or 1(quantity has to be decremented by 1) ' })
      }

      let findQuantity = findCart.items.find(x => x.productId.toString() === productId) //returns object
      //console.log(findQuantity)

      if (removeProduct === 0) {
          let totalAmount = findCart.totalPrice - (findProduct.price * findQuantity.quantity) // substract the amount of product*quantity

          await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })

          let quantity = findCart.totalItems - 1
          let data = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: totalAmount, totalItems: quantity } }, { new: true }) //update the cart with total items and totalprice

          return res.status(200).send({ status: true, message: `${productId} is been removed`, data: data })
      }

      // decrement quantity
      let totalAmount = findCart.totalPrice - findProduct.price
      let itemsArr = findCart.items

      for (i in itemsArr) {
          if (itemsArr[i].productId.toString() == productId) {
              itemsArr[i].quantity = itemsArr[i].quantity - 1

              if (itemsArr[i].quantity < 1) {
                  await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })
                  let quantity = findCart.totalItems - 1

                  let data = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: totalAmount, totalItems: quantity } }, { new: true }) //update the cart with total items and totalprice

                  return res.status(200).send({ status: true, message: `No such quantity/product exist in cart`, data: data })
              }
          }
      }
      let data = await cartModel.findOneAndUpdate({ _id: cartId }, { items: itemsArr, totalPrice: totalAmount }, { new: true })

      return res.status(200).send({ status: true, message: `${productId} quantity is been reduced By 1`, data: data })

  } catch (err) {
      return res.status(500).send({ status: false, message: err.message });
  }
}

// -------------------------------------------------FETCH CART------------------------------------------------

const getCart = async function(req,res)
{
  try 
  {
    const userId = req.params.userId;

    if(!isValidObjectId(userId)){
      return res.status(400).send({ status: false, message: "Invalid userId in params." })
    }

    const findUser = await userModel.findById(userId)
    if(!findUser){
      return res.status(400).send({status: false, message: `User doesn't exists by ${userId} `})
    }

    const findCart = await cartModel.findOne({ userId: userId })

    if(!findCart) {
      return res.status(400).send({status:false, message: `Cart doesn't exists by ${userId} `})
    }

    res.status(200).send({ status: true, message: "Successfully fetched cart.", data: findCart })
  } 
  catch (err) 
  {
    res.status(500).send({ status: false, message: err.message });
  }
}

// ---------------------------------------------DELETE CART-----------------------------------------------

const deleteCart = async function(req,res) 
{
  try 
  {
    const userId = req.params.userId

    if(!isValidObjectId(userId)){
      return res.status(400).send({ status: false, message: "Invalid userId in params." })
    }

    const findUser = await userModel.findById(userId)
    if (!findUser){
      return res.status(400).send({status: false,message: `User doesn't exists by ${userId} `})
    }

    //finding cart
    const findCart = await cartModel.findOne({ userId: userId })
    if(!findCart){
      return res.status(400).send({status: false,message: `Cart doesn't exists by ${userId} `})
    }

    //Basically not deleting the cart, just changing their value to 0.
    const deleteCart = await cartModel.findOneAndUpdate({ userId: userId }, {$set: {items: [],totalPrice: 0,totalItems: 0}},{new:true})

    res.status(201).send({status: true,message: "Cart deleted successfully",data:deleteCart })
  } 
  catch (err) 
  {
    return res.status(500).send({ status: false, message: err.message });
  }
}

// -----------------------------------Exports--------------------------------------------------------------
module.exports = { createCart, updateCart, getCart, deleteCart };


