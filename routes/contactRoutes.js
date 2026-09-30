const express = require("express");
const router = express.Router();
const { sendMessage, getMessages, replyToQuery, updateStatus, getUserQueries } = require("../controllers/contactController");
const protect = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

router.post("/", sendMessage);
router.get("/", protect, adminMiddleware, getMessages);
router.put("/:id/reply", protect, adminMiddleware, replyToQuery);
router.put("/:id/status", protect, adminMiddleware, updateStatus);
router.get('/user/:email', protect, (req,res,next) => {
  if (req.params.email.toLowerCase() !== req.userEmail?.toLowerCase() && req.userRole !== 'admin') return res.status(403).json({message:'Access denied'});
  next();
}, getUserQueries);

module.exports = router;
