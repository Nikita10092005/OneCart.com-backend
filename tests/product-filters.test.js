jest.mock('../models/productModel', () => ({find:jest.fn()}));
const Product = require('../models/productModel');
const express = require('express');
const http = require('http');
let server, base;
beforeAll(async () => {
  const app = express();
  app.use('/products', require('../routes/productRoutes'));
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  base = `http://127.0.0.1:${server.address().port}/products`;
});
afterAll(async () => {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
beforeEach(() => {Product.find.mockReset().mockReturnValue({sort:jest.fn().mockResolvedValue([])});});
test('category filters include legacy and new category formats', async () => {
  expect((await fetch(base+'?main=Kids&sub=Toys')).status).toBe(200);
  const categories = Product.find.mock.calls[0][0].category.$in;
  expect(categories).toContain('Toys');
  expect(categories.some(value => value instanceof RegExp && value.test('Kids|Toys'))).toBe(true);
});
test('fashion category includes men and women product prefixes', async () => {
  await fetch(base+'?main=Fashion');
  const patterns = Product.find.mock.calls[0][0].category.$in.filter(value => value instanceof RegExp);
  expect(patterns.some(value=>value.test('Women|Sarees') && value.test('Men|Shirts'))).toBe(true);
});
test('search input is treated as text, not an executable regex', async () => {
  await fetch(base+'?search='+encodeURIComponent('(a+)+$'));
  const query = Product.find.mock.calls[0][0].$or[0].name;
  const regex = new RegExp(query.$regex,query.$options);
  expect(regex.test('(a+)+$')).toBe(true);
  expect(regex.test('aaaa')).toBe(false);
});
test('array search parameters are rejected before accessing products', async () => {
  expect((await fetch(base+'?search=a&search=b')).status).toBe(400);
  expect(Product.find).not.toHaveBeenCalled();
});
