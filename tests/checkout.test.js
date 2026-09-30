jest.mock('../models/cartModel',()=>({find:jest.fn()}));
jest.mock('../models/couponModel',()=>({findOne:jest.fn()}));
jest.mock('../models/taxModel',()=>({find:jest.fn()}));
const Cart=require('../models/cartModel'),Coupon=require('../models/couponModel'),Tax=require('../models/taxModel');
const {quoteCart}=require('../utils/checkout');
beforeEach(()=>{jest.clearAllMocks();Tax.find.mockResolvedValue([]);});
const cart=items=>Cart.find.mockReturnValue({populate:jest.fn().mockResolvedValue(items)});
test('prices checkout using database values',async()=>{
 cart([{_id:'item',productId:{_id:'p',price:100,stock:3},quantity:2}]);
 const quote=await quoteCart('alice');expect(quote.total).toBe(249);expect(quote.fingerprint).toHaveLength(64);
});
test('rejects deleted products rather than creating partial orders',async()=>{
 cart([{productId:null,quantity:1}]);await expect(quoteCart('alice')).rejects.toThrow('unavailable');
});
test('caps coupon discount at subtotal',async()=>{
 cart([{_id:'item',productId:{_id:'p',price:100,stock:3},quantity:1}]);
 Coupon.findOne.mockResolvedValue({code:'SAVE',startDate:new Date(0),endDate:new Date('2099-01-01'),discountType:'fixed',discountValue:1000});
 const quote=await quoteCart('alice','SAVE');expect(quote.discount).toBe(100);expect(quote.total).toBe(49);
});
test('rejects expired coupons',async()=>{
 cart([{productId:{_id:'p',price:100,stock:3},quantity:1}]);
 Coupon.findOne.mockResolvedValue({startDate:new Date(0),endDate:new Date(1)});
 await expect(quoteCart('alice','OLD')).rejects.toThrow('unavailable');
});
