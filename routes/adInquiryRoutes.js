const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { submitInquiry, getMyInquiry, getAllInquiries } = require("../controllers/adInquiryController");

router.post("/", protect, submitInquiry);
router.get("/my", protect, getMyInquiry);
router.get("/admin", adminOnly, getAllInquiries);

module.exports = router;
