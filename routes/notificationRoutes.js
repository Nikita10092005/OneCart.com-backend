const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const { getNotifications, markAsRead, broadcastPromo, deleteNotification } = require("../controllers/notificationController");

// GET /api/notifications - fetch notifications for authenticated user
router.get("/", protect, getNotifications);

// PATCH /api/notifications/:id/read - mark a notification as read
router.patch("/:id/read", protect, markAsRead);

// DELETE /api/notifications/:id - dismiss/delete a notification
router.delete("/:id", protect, deleteNotification);

// POST /api/notifications/broadcast - admin-only promo broadcast
router.post("/broadcast", protect, adminOnly, broadcastPromo);

module.exports = router;
