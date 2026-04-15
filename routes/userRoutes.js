const express = require("express");
const router = express.Router();
const User = require("../models/User");
const multer = require("multer");

// IMAGE UPLOAD CONFIG
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// GET PROFILE
router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

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

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true });

  res.json(user);
});

module.exports = router;