const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const addToCart = async (req,res) => {
  const {productId} = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({message:'Product not found'});
  const existing = await Cart.findOne({productId, userId:req.user});
  if ((existing?.quantity || 0) + 1 > product.stock) return res.status(400).json({message:'Not enough stock'});
  if (existing) { existing.quantity += 1; await existing.save(); return res.json(existing); }
  res.json(await Cart.create({productId,userId:req.user,quantity:1}));
};
const getCart = async(req,res) => res.json(await Cart.find({userId:req.user}).populate('productId'));
const updateCart = async(req,res) => {
  const quantity = Number(req.body.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1) return res.status(400).json({message:'Quantity must be a positive whole number'});
  const item = await Cart.findOne({_id:req.params.id,userId:req.user}).populate('productId');
  if (!item) return res.status(404).json({message:'Cart item not found'});
  if (!item.productId || quantity > item.productId.stock) return res.status(400).json({message:'Not enough stock'});
  item.quantity = quantity; await item.save(); res.json(item);
};
const removeItem = async(req,res) => {
  await Cart.findOneAndDelete({_id:req.params.id,userId:req.user});
  res.json({message:'Item removed'});
};
module.exports = {addToCart,getCart,updateCart,removeItem};
