const express = require("express");
const router = express.Router();
const Cart = require('../models/cartModel');
router.use(require('../middleware/authMiddleware'));

const {
  addToCart,
  getCart,
  updateCart,
  removeItem
} = require("../controllers/cartController");

/* ADD PRODUCT */
router.post("/", addToCart);

/* GET CART */
router.get("/", getCart);

/* UPDATE QUANTITY */
router.put("/:id", updateCart);

/* REMOVE ITEM */
router.delete("/:id", removeItem);


router.delete("/user/:userId", async(req,res)=>{

if (req.params.userId !== String(req.user)) return res.status(403).json({message:'Access denied'});
await Cart.deleteMany({userId:req.user});

res.json({message:"Cart cleared"});

});
module.exports = router;