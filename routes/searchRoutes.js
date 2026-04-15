const express = require("express");
const multer = require("multer");
const { imageSearch } = require("../controllers/searchController");

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WEBP under 5MB accepted"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/image", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, imageSearch);

module.exports = router;
