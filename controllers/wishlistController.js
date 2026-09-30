const Wishlist = require("../models/wishlistModel");

const addToWishlist = async(req,res)=>{

 const {productId} = req.body;
 const userId = req.user;
 const existing = await Wishlist.findOne({userId,productId});
 if (existing) return res.json(existing);

 const item = await Wishlist.create({
  userId,
  productId
 });

 res.json(item);
}

const getWishlist = async(req,res)=>{

 const items = await Wishlist.find({
  userId:req.user
 }).populate("productId");

 res.json(items);
}

const removeFromWishlist = async (req, res) => {
  try {
    await Wishlist.findOneAndDelete({_id:req.params.itemId,userId:req.user});
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