jest.mock('razorpay',()=>jest.fn());
const Razorpay=require('razorpay');
const {verifiedPayment}=require('../utils/paymentGateway');
let payment,order;
beforeEach(()=>{
 process.env.RAZORPAY_KEY_ID='test';process.env.RAZORPAY_KEY_SECRET='test';
 payment={status:'captured',currency:'INR',amount:10000,amount_refunded:0,order_id:'order_test'};
 order={amount:10000,notes:{userId:'alice',purpose:'checkout'}};
 Razorpay.mockImplementation(()=>({payments:{fetch:jest.fn(async()=>payment)},orders:{fetch:jest.fn(async()=>order)}}));
});
test('accepts captured payment for its owner and purpose',async()=>{
 await expect(verifiedPayment('pay_test','alice','checkout')).resolves.toEqual({payment,order});
});
test.each([
 ['another account',()=>{order.notes.userId='bob';}],
 ['wallet payment reused for checkout',()=>{order.notes.purpose='wallet';}],
 ['uncaptured payment',()=>{payment.status='authorized';}],
 ['refunded payment',()=>{payment.amount_refunded=10000;}],
 ['wrong amount',()=>{payment.amount=1;}],
])('rejects %s',async(label,change)=>{
 change();await expect(verifiedPayment('pay_test','alice','checkout')).rejects.toThrow('could not be verified');
});
test('missing provider keys fail closed',async()=>{
 delete process.env.RAZORPAY_KEY_SECRET;
 await expect(verifiedPayment('pay_test','alice','checkout')).rejects.toThrow('unavailable');
});
