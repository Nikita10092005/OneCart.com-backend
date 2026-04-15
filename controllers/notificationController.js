const Notification = require("../models/Notification");
const User = require("../models/User");
const { createInAppNotification } = require("../utils/notificationService");

// GET /api/notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user }).sort({ createdAt: -1 });
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    if (notification.userId.toString() !== req.user.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    notification.read = true;
    await notification.save();
    res.json({ notification });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/notifications/broadcast
const broadcastPromo = async (req, res) => {
  try {
    const users = await User.find({}, "_id");
    await Promise.all(
      users.map((u) => createInAppNotification(u._id, req.body.message, "promo"))
    );
    res.json({ sent: users.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    if (notification.userId.toString() !== req.user.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getNotifications, markAsRead, broadcastPromo, deleteNotification };
