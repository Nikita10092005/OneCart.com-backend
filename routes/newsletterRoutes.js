const router=require('express').Router();
const mongoose=require('mongoose');
const Subscriber=mongoose.model('Subscriber',new mongoose.Schema({
  email:{type:String,required:true,unique:true},
},{timestamps:true}));
router.post('/',require('../middleware/rateLimit')({limit:10}),async(req,res)=>{
  const email=typeof req.body.email==='string'?req.body.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({message:'Enter a valid email address'});
  await Subscriber.updateOne({email},{$setOnInsert:{email}},{upsert:true});
  res.json({message:'Subscribed successfully'});
});
module.exports=router;
