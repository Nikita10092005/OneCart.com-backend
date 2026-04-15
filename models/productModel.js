const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

name:{
type:String,
required:true
},

price:{
type:Number,
required:true
},

image:{
type:String
},

category:{
type:String,
required:true
},

description:{
type:String
},

stock:{
 type:Number,
 default:0
},

discount:{
 type:Number,
 default:0
},

moodTags: {
  type: [String],
  enum: ["Casual", "Party", "Fitness"],
  default: []
},

sellerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
}
},{timestamps:true});

module.exports = mongoose.model("Product",productSchema);