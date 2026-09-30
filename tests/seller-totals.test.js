const sellerTotals = require('../utils/sellerTotals');
test('payout includes every line for each seller and uses order price snapshots', () => {
  const lines = [
    { productId: { sellerId: 'a', price: 999 }, price: 100, quantity: 2 },
    { productId: { sellerId: 'a', price: 50 }, quantity: 1 },
    { productId: { sellerId: 'b', price: 80 }, quantity: 1 },
    { productId: null, quantity: 1 },
  ];
  expect([...sellerTotals(lines, 0.1)]).toEqual([['a', 225], ['b', 72]]);
});
test('invalid commission fails closed', () => {
  expect(() => sellerTotals([], NaN)).toThrow();
  expect(() => sellerTotals([], 2)).toThrow();
});
