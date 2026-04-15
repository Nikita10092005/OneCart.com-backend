const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an email. Never throws — logs failure silently.
 */
async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html });
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}

/**
 * Create and persist an in-app notification document.
 * @returns {Promise<Document>} the saved Notification doc
 */
async function createInAppNotification(userId, message, type, orderId = null, stage = null) {
  const doc = new Notification({ userId, message, type, orderId, stage });
  return doc.save();
}

module.exports = { sendEmail, createInAppNotification };
