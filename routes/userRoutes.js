const express = require("express");
const router = express.Router();
const User = require("../models/User");
const upload = require('../middleware/upload');
router.use(require('../middleware/authMiddleware'));
router.use('/profile/:id', (req,res,next) => {
  if (req.params.id !== String(req.user)) return res.status(403).json({message:'Access denied'});
  next();
});

// GET PROFILE
router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE PROFILE
router.put("/profile/:id", upload.single("profilePic"), async (req, res) => {
  const updates = {
    name: req.body.name,
    phone: req.body.phone,
    address: req.body.address,
    city: req.body.city,
    state: req.body.state,
    pincode: req.body.pincode,
    gender: req.body.gender
  };

  if (req.file) {
    updates.profilePic = req.file.filename;
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select("-password");

  res.json(user);
});

module.exports = router;