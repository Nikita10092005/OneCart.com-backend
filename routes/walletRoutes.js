const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getBalance, createReloadOrder, verifyReload, getTransactions } = require("../controllers/walletController");

router.get("/balance", protect, getBalance);
router.post("/create-order", protect, createReloadOrder);
router.post("/verify", protect, verifyReload);
router.get("/transactions", protect, getTransactions);

module.exports = router;
