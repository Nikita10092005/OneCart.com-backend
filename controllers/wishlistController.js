const Wishlist = require("../models/wishlistModel");

const addToWishlist = async(req,res)=>{

 const {userId,productId} = req.body;

 const item = await Wishlist.create({
  userId,
  productId
 });

 res.json(item);
}

const getWishlist = async(req,res)=>{

 const items = await Wishlist.find({
  userId:req.params.userId
 }).populate("productId");

 res.json(items);
}

const removeFromWishlist = async (req, res) => {
  try {
    await Wishlist.findByIdAndDelete(req.params.itemId);
    res.json({ message: "Removed from wishlist" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addToWishlist,
  getWishlist,
  removeFromWishlist
}