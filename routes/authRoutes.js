// const express = require("express");
// const router = express.Router();

// const { registerUser, loginUser, googleLogin } = require("../controllers/authController");

// router.post("/register", registerUser);
// router.post("/login", loginUser);
// router.post("/google", googleLogin);

// module.exports = router;

const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  googleLogin
} = require("../controllers/authController");

const authLimit = require('../middleware/rateLimit')();
router.post("/register", authLimit, registerUser);
router.post("/login", authLimit, loginUser);
router.post("/google", authLimit, googleLogin);

module.exports = router;
