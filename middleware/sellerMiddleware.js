const sellerOnly = (req, res, next) => {
  if (req.userRole === "seller") return next();
  return res.status(403).json({ message: "Seller access only" });
};

module.exports = sellerOnly;
