const mongoose = require('mongoose');
// The provider payment ID is the primary key, preventing reuse across orders/wallets.
module.exports = mongoose.model('PaymentReceipt', new mongoose.Schema({
  _id:String,
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  purpose:{type:String,enum:['checkout','wallet'],required:true},
  amount:{type:Number,required:true},
}, {timestamps:true}));
