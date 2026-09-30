const crypto = require('crypto');
const Cart = require('../models/cartModel');
const Coupon = require('../models/couponModel');
const Tax = require('../models/taxModel');

const fail = message => Object.assign(new Error(message), {status:400});
const money = value => Math.round(value * 100) / 100;
async function quoteCart(userId, couponCode) {
  const items = await Cart.find({userId}).populate('productId');
  if (!items.length) throw fail('Cart is empty');
  for (const item of items) {
    if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.productId.stock < item.quantity || !Number.isFinite(item.productId.price) || item.productId.price < 0) throw fail('A cart item is unavailable. Please update your cart.');
  }
  const subtotal = money(items.reduce((sum,item)=>sum + item.productId.price * item.quantity,0));
  let coupon = null, discount = 0;
  if (couponCode) {
    if (typeof couponCode !== 'string') throw fail('Invalid coupon');
    coupon = await Coupon.findOne({code:couponCode.trim().toUpperCase(),isActive:true});
    const now = new Date();
    if (!coupon || now < coupon.startDate || now > coupon.endDate || (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) || subtotal < coupon.minOrderAmount) throw fail('Coupon is unavailable for this order');
    // Product/category restricted coupons require item-level pricing support.
    if (coupon.applicableProducts?.length || coupon.applicableCategories?.length) throw fail('This coupon is not available for this cart');
    discount = coupon.discountType === 'percentage' ? subtotal * coupon.discountValue / 100 : coupon.discountValue;
    if (coupon.maxDiscountAmount != null) discount = Math.min(discount,coupon.maxDiscountAmount);
    discount = money(Math.min(subtotal,Math.max(0,discount)));
  }
  const taxes = await Tax.find({country:'IN',isActive:true,state:{$in:['',null]},zipCode:{$in:['',null]}});
  const tax = Math.round((subtotal-discount) * taxes.reduce((sum,t)=>sum+t.taxRate,0)/100);
  const delivery = 49;
  const total = money(subtotal - discount + tax + delivery);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify({items:items.map(i=>[String(i.productId._id),i.quantity,i.productId.price]).sort(),coupon:coupon?.code,total})).digest('hex');
  return {items,subtotal,discount,tax,delivery,total,coupon,fingerprint};
}
module.exports = {quoteCart, money, fail};
