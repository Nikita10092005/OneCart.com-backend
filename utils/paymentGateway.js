const Razorpay = require('razorpay');
const {fail} = require('./checkout');
function gateway() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) throw Object.assign(new Error('Payment service unavailable'),{status:503});
  return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
}
async function verifiedPayment(paymentId,userId,purpose) {
  if (typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw fail('A valid payment is required');
  const api = gateway();
  const payment = await api.payments.fetch(paymentId);
  const order = await api.orders.fetch(payment.order_id);
  if (payment.status !== 'captured' || payment.currency !== 'INR' || payment.amount_refunded > 0 || String(order.notes?.userId) !== String(userId) || order.notes?.purpose !== purpose || payment.amount !== order.amount) throw fail('Payment could not be verified for this account');
  return {payment,order};
}
module.exports = {gateway,verifiedPayment};
