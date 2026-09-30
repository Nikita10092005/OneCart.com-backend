const express = require('express');
const http = require('http');
const routes = [
  ['/cart',require('../routes/cartRoutes')],
  ['/wishlist',require('../routes/wishlistRoutes')],
  ['/user',require('../routes/userRoutes')],
  ['/messages',require('../routes/messageRoutes')],
];
let server,base;
beforeAll(async()=>{
  const app=express();app.use(express.json());
  routes.forEach(([prefix,router])=>app.use(prefix,router));
  server=http.createServer(app);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port;
});
afterAll(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
test.each(['/cart','/wishlist/000000000000000000000000','/user/profile/000000000000000000000000','/messages'])('anonymous GET %s cannot expose private data',async route=>{
  const response=await fetch(base+route);expect(response.status).toBe(401);
});
test('anonymous profile changes are rejected before upload',async()=>{
  const response=await fetch(base+'/user/profile/000000000000000000000000',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Unauthorized'})});
  expect(response.status).toBe(401);
});
