jest.mock('../models/User',()=>({findById:jest.fn()}));
jest.mock('jsonwebtoken',()=>({verify:jest.fn()}));
const User=require('../models/User');
const jwt=require('jsonwebtoken');
const protect=require('../middleware/authMiddleware');
const admin=require('../middleware/adminMiddleware');
const response=()=>({status:jest.fn().mockReturnThis(),json:jest.fn().mockReturnThis()});
beforeEach(()=>jest.clearAllMocks());
test('rejects anonymous requests',async()=>{
 const res=response(),next=jest.fn();await protect({headers:{}},res,next);
 expect(res.status).toHaveBeenCalledWith(401);expect(next).not.toHaveBeenCalled();
});
test('revoked admin token does not retain admin access',async()=>{
 jwt.verify.mockReturnValue({id:'user',role:'admin'});
 User.findById.mockReturnValue({select:jest.fn().mockResolvedValue({role:'user',accountStatus:'active'})});
 const res=response(),next=jest.fn();await admin({headers:{authorization:'Bearer token'}},res,next);
 expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();
});
test('banned administrator cannot authenticate',async()=>{
 jwt.verify.mockReturnValue({id:'user',role:'admin'});
 User.findById.mockReturnValue({select:jest.fn().mockResolvedValue({role:'admin',accountStatus:'banned'})});
 const res=response(),next=jest.fn();await admin({headers:{authorization:'Bearer token'}},res,next);
 expect(res.status).toHaveBeenCalledWith(403);expect(next).not.toHaveBeenCalled();
});
test('active admin retains the consistent raw user ID',async()=>{
 jwt.verify.mockReturnValue({id:'admin',role:'user'});
 User.findById.mockReturnValue({select:jest.fn().mockResolvedValue({role:'admin',accountStatus:'active'})});
 const req={headers:{authorization:'Bearer token'}},res=response(),next=jest.fn();await admin(req,res,next);
 expect(next).toHaveBeenCalled();expect(req.user).toBe('admin');expect(req.userRole).toBe('admin');
});
