const Cart = require("../models/cartModel");

/* ADD */

const addToCart = async (req,res)=>{

const {productId,userId} = req.body;

const existing = await Cart.findOne({productId,userId});

if(existing){

existing.quantity += 1;
await existing.save();

return res.json(existing);

}

const item = await Cart.create({
productId,
userId,
quantity:1
});

res.json(item);

};

/* GET */

const getCart = async(req,res)=>{

const userId = req.query.userId;

const filter = userId ? { userId } : {};

const cart = await Cart.find(filter).populate("productId");

res.json(cart);

};


/* UPDATE */

const updateCart = async(req,res)=>{

const {quantity} = req.body;

const item = await Cart.findById(req.params.id);

item.quantity = quantity;

await item.save();

res.json(item);

};


/* DELETE */

const removeItem = async(req,res)=>{

await Cart.findByIdAndDelete(req.params.id);

res.json({message:"Item removed"});

};

module.exports = {
addToCart,
getCart,
updateCart,
removeItem
};
