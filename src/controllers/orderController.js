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

//-------------------------------------------CREATE ORDER-------------------------------------------------

const createOrder = async function (req, res) {
    try {
        const userId = req.params.userId;
        const requestBody = req.body;

        if (!isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Invalid request body. Please provide the the input to proceed", });
        };
        //Extract Params
        const { cartId, cancellable, status } = requestBody;

        if (!isValidObjectId(userId)) {
            return re.status(400).send({ status: false, message: "Invalid userId in params." });
        };
        // find User
        const findUser = await userModel.findOne({ _id: userId });
        if (!findUser) {
            return res.status(400).send({ status: false, message: "user doesn't exists for uderId" });
        };

        if (!cartId) {
            return res.status(400).send({ status: false, message: "CartId is required field}" });
        };

        if (!isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "Invalid cartId in request body" });
        };

        const findCartDetails = await cartModel.findOne({ _id: cartId, userId: userId, });

        if (!findCartDetails) {
            return res.status(400).send({ status: false, message: `Cart doesn't belongs to ${userId}` });
        };

        if (cancellable) {
            if (typeof cancellable != "boolean") {
                return res.status(400).send({ status: false, message: "cancel must be boolean value true or false" });
            }
        };

        if (status) {
            if (!["pending", "completed", "cancelled"].includes(status)) {
                return res.status(400).send({ status: false, message: "Status must be among ['pending','completed','cancelled']", });
            }
        };

        //verifying whether the cart is having any products or not
        if (!findCartDetails.items.length) {
            return res.status(400).send({ status: false, message: "Order already placed for this cart. Please add some products in cart to make an order", });
        };

        let totalQuantity = 0;
        for (let i in findCartDetails.items) {
            totalQuantity += findCartDetails.items[i].quantity;
        };

        //object destructuring for response body
        const orderDetails = {
            userId: userId,
            items: findCartDetails.items,
            totalPrice: findCartDetails.totalPrice,
            totalItems: findCartDetails.totalItems,
            totalQuantity: totalQuantity,
            cancellable,
            status,
        };

        const savedOrder = await orderModel.create(orderDetails);
        res.status(200).send({ status: true, message: "Sucessfully Order placed", data: savedOrder });

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
};

// ------------------------------------UPDATE ORDER--------------------------------------------------------

const updateOrder = async function (req, res) {
    try {
        let userId = req.params.userId;
        //Extract Params
        const { orderId, isDeleted, status } = req.body;

        if (!isValidRequestBody(req.body)) {
            return res.status(400).send({ status: false, message: "Invalid request body. Please provide the the input to proceed", });
        };

        if (!orderId)
            return res.status(400).send({ status: false, message: "orderId is required field" });

        if (!isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "Invalid orderId in body." });
        };

        let findOrderDateils = await orderModel.findOne({ _id: orderId, userId, isDeleted: false, });

        if (!findOrderDateils) return res.status(404).send({ status: false, message: "order not found with this UserId and OrderId" });
        // if cancellable true 
        if (findOrderDateils.cancellable) {
            if (isDeleted == true) {
                let updatedOrder = await orderModel.findOneAndUpdate({ _id: orderId, userId }, { isDeleted, status, deletedAt: Date.now() }, { new: true });

                return res.status(200).send({ status: true, message: "sucessfully Order updated. ", data: updatedOrder });
            }

            let updatedOrder = await orderModel.findOneAndUpdate({ _id: orderId, userId }, { status }, { new: true });
            return res.status(200).send({ status: true, message: "sucessfully Order updated..", data: updatedOrder });
        };
        // if cancellable true & status is cancelled
        if (!findOrderDateils.cancellable && status == "cancelled")
            return res.status(400).send({ status: false, message: "cant modify status to cancelled,as cancellable is false", });

        if (isDeleted == true) {
            let updatedOrder = await orderModel.findOneAndUpdate({ _id: orderId, userId }, { isDeleted, status, deletedAt: Date.now() }, { new: true });
            return res.status(200).send({ status: true, message: "sucessfully Order updated...", data: updatedOrder });
        };

        let updatedOrder = await orderModel.findOneAndUpdate({ _id: orderId, userId }, { status }, { new: true });
        res.status(200).send({ status: true, message: "sucessfully Order updated....", data: updatedOrder, });
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message });  
    }
};

// ------------------------------------Exports---------------------------------------------------------------

module.exports = { createOrder, updateOrder }