const express = require("express");
const router = express.Router();

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

await Cart.deleteMany({userId:req.params.userId});

res.json({message:"Cart cleared"});

});
module.exports = router;