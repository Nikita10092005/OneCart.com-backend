jest.mock('../models/cartModel',()=>({find:jest.fn(),findOne:jest.fn(),findOneAndDelete:jest.fn(),create:jest.fn()}));
jest.mock('../models/productModel',()=>({findById:jest.fn()}));
const Cart=require('../models/cartModel');
const Product=require('../models/productModel');
const controller=require('../controllers/cartController');
const response=()=>({status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()});
beforeEach(()=>jest.clearAllMocks());
test('cart reads are scoped to authenticated owner, ignoring query userId',async()=>{
 Cart.find.mockReturnValue({populate:jest.fn().mockResolvedValue([])});
 await controller.getCart({user:'alice',query:{userId:'bob'}},response());
 expect(Cart.find).toHaveBeenCalledWith({userId:'alice'});
});
test('cart deletion cannot delete another users item',async()=>{
 await controller.removeItem({user:'alice',params:{id:'item'}},response());
 expect(Cart.findOneAndDelete).toHaveBeenCalledWith({_id:'item',userId:'alice'});
});
test.each([0,-1,1.5,Infinity])('reject invalid quantity %s',async quantity=>{
 const res=response();await controller.updateCart({user:'alice',body:{quantity},params:{id:'item'}},res);
 expect(res.status).toHaveBeenCalledWith(400);expect(Cart.findOne).not.toHaveBeenCalled();
});
test('cannot add an out of stock product',async()=>{
 Product.findById.mockResolvedValue({stock:0});Cart.findOne.mockResolvedValue(null);
 const res=response();await controller.addToCart({user:'alice',body:{productId:'product',userId:'bob'}},res);
 expect(res.status).toHaveBeenCalledWith(400);expect(Cart.create).not.toHaveBeenCalled();
});
