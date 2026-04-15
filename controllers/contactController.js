const Contact = require("../models/contactModel");

/* USER SEND MESSAGE */
const sendMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    await Contact.create({ name, email, message });
    res.json({ message: "Message sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending message" });
  }
};

/* ADMIN GET ALL QUERIES */
const getMessages = async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages" });
  }
};

/* ADMIN REPLY TO QUERY */
const replyToQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply } = req.body;
    const contact = await Contact.findByIdAndUpdate(
      id,
      { adminReply, status: "replied", repliedAt: new Date() },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: "Query not found" });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: "Error sending reply" });
  }
};

/* ADMIN UPDATE STATUS */
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const contact = await Contact.findByIdAndUpdate(id, { status }, { new: true });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: "Error updating status" });
  }
};

/* USER GET THEIR OWN QUERIES BY EMAIL */
const getUserQueries = async (req, res) => {
  try {
    const { email } = req.params;
    const queries = await Contact.find({ email }).sort({ createdAt: -1 });
    res.json(queries);
  } catch (error) {
    res.status(500).json({ message: "Error fetching queries" });
  }
};

module.exports = { sendMessage, getMessages, replyToQuery, updateStatus, getUserQueries };
