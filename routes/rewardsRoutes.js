const express = require("express");
const router = express.Router();
const { getRewards, getPointHistory } = require("../controllers/rewardsController");
const protect = require("../middleware/authMiddleware");

router.get("/", protect, getRewards);
router.get("/history", protect, getPointHistory);

module.exports = router;
