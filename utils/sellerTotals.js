// Group all order lines before creating the one payout per seller/order.
module.exports = function sellerTotals(items, commissionRate) {
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) {
    throw new Error("PLATFORM_COMMISSION_RATE must be between 0 and 1");
  }
  const totals = new Map();
  for (const item of items) {
    const product = item.productId;
    if (!product?.sellerId) continue;
    const seller = product.sellerId.toString();
    const amount = (item.price ?? product.price ?? 0) * (item.quantity || 1);
    totals.set(seller, (totals.get(seller) || 0) + amount);
  }
  return new Map([...totals].map(([seller, amount]) => [seller, Math.round(amount * (1 - commissionRate) * 100) / 100]));
};
