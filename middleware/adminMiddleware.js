const protect = require('./authMiddleware');
module.exports = (req, res, next) => {
  const authorize = () => req.userRole === 'admin'
    ? next() : res.status(403).json({ message: 'Admin access only' });
  return req.user && req.userRole ? authorize() : protect(req, res, authorize);
};
