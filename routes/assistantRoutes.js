const express = require("express");
const router = express.Router();
const { queryAssistant } = require("../controllers/assistantController");

// POST /api/assistant/query
router.post("/query", queryAssistant);

module.exports = router;
