const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { signUp, getMyProfile, getAllAffiliates, updateStatus } = require("../controllers/affiliateController");

router.post("/", protect, signUp);
router.get("/my", protect, getMyProfile);
router.get("/admin", adminOnly, getAllAffiliates);
router.put("/admin/:id/status", adminOnly, updateStatus);

module.exports = router;
