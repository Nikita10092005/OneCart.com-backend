const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("accountStatus role email");

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (user.accountStatus === "banned" || user.accountStatus === "suspended") {
        return res.status(403).json({ message: "Account is banned/suspended" });
      }

      req.user = decoded.id;
      req.userRole = user.role;
      req.userEmail = user.email;

      return next();
    } catch (error) {
      return res.status(401).json({ message: "Token failed" });
    }
  }

  return res.status(401).json({ message: "No token provided" });
};

module.exports = protect;
