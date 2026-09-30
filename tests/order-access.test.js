jest.mock('../models/orderModel',()=>({findById:jest.fn()}));
jest.mock('../utils/notificationService',()=>({}));
jest.mock('../utils/sellerMetrics',()=>({}));
jest.mock('../controllers/sellerPayoutController',()=>({}));
const Order=require('../models/orderModel');
const orders=require('../controllers/orderController');
const response=()=>({status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()});
test('cannot read another customers order',async()=>{
 Order.findById.mockReturnValue({populate:jest.fn().mockResolvedValue({userId:'bob'})});
 const res=response();await orders.getOrderById({user:'alice',params:{orderId:'order'},userRole:'user'},res);
 expect(res.status).toHaveBeenCalledWith(403);
});
test('customer cannot mark an order delivered',async()=>{
 const res=response();await orders.updateOrderStatus({body:{status:'Delivered'}},res);
 expect(res.status).toHaveBeenCalledWith(403);
});
