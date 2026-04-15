const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { submitApplication, getAllApplications, replyToApplication, getMyApplications } = require("../controllers/jobApplicationController");

router.post("/", protect, submitApplication);           // user submits
router.get("/mine", protect, getMyApplications);        // user views own
router.get("/", adminOnly, getAllApplications);          // admin views all
router.put("/:id/reply", adminOnly, replyToApplication); // admin replies

module.exports = router;
