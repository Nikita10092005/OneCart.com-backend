// const express = require("express");
// const router = express.Router();

// const Message = require("../models/Message");

// // SAVE MESSAGE
// router.post("/", async (req, res) => {
//   try {
//     const msg = await Message.create(req.body);
//     res.json(msg);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // GET ALL
// router.get("/", require("../middleware/adminMiddleware"), async (req, res) => {
//   const msgs = await Message.find().sort({ createdAt: 1 });
//   res.json(msgs);
// });

// router.get("/", async (req, res) => {
//   const messages = await Message.find().sort({ createdAt: 1 });
//   res.json(messages);
// });
// module.exports = router;

const express = require("express");
const router = express.Router();
const Message = require("../models/Message");

// GET ALL MESSAGES (ADMIN PANEL)
router.get("/", require("../middleware/adminMiddleware"), async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

module.exports = router;
