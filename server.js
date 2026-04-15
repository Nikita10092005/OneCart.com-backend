require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const path = require("path");

/* 🔥 DNS FORCE (ADD THIS) */
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]); // Google DNS

/* 🔥 NEW IMPORTS */
const http = require("http");
const { Server } = require("socket.io");

const Message = require("./models/Message");
const getAutoReply = require("./utils/autoReply");

/* 🔥 PRICE ALERT SCHEDULER - TEMPORARILY DISABLED */
// require("./utils/priceAlertScheduler");

const app = express();

/* DATABASE */
connectDB();

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected. Attempting to reconnect…");
  setTimeout(connectDB, 5000);
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

/* MIDDLEWARE */
app.use(cors({
  origin: "*",
  exposedHeaders: ["x-rtb-fingerprint-id", "request-id"]
}));
app.use(express.json());

/* ROUTES */
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const contactRoutes = require("./routes/contactRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");

/* API ROUTES */
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/contact", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/user", userRoutes);
app.use("/api/recommendations", require("./routes/recommendationRoutes"));
app.use("/api/notifications",   require("./routes/notificationRoutes"));
app.use("/api/search",          require("./routes/searchRoutes"));
app.use("/api/assistant",       require("./routes/assistantRoutes"));
app.use("/api/price-alerts",    require("./routes/priceAlertRoutes"));
app.use("/api/comparison",      require("./routes/comparisonRoutes"));
app.use("/api/financial",       require("./routes/financialRoutes"));
app.use("/api/rewards",         require("./routes/rewardsRoutes"));
app.use("/api/payment",         require("./routes/paymentRoutes"));
app.use("/api/wallet",          require("./routes/walletRoutes"));
app.use("/api/jobs",            require("./routes/jobApplicationRoutes"));
app.use("/api/seller",          require("./routes/sellerRoutes"));
app.use("/api/card-application", require("./routes/cardApplicationRoutes"));
app.use("/api/ad-inquiry",       require("./routes/adInquiryRoutes"));
app.use("/api/affiliate",        require("./routes/affiliateRoutes"));

/* STATIC */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* 🔥 SOCKET SERVER SETUP */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const productViewers = new Map();

/* 🔥 SOCKET LOGIC */
io.on("connection", (socket) => {

  /* USER JOIN ROOM */
  socket.on("joinRoom", (userId) => {
    socket.join(userId);
  });

  /* ADMIN JOIN */
  socket.on("joinAdmin", () => {
    socket.join("admin");
  });

  socket.on("sendMessage", async (msg) => {
    try {
      const savedMsg = await Message.create({
        userId: msg.userId,
        userEmail: msg.userEmail,
        text: msg.text,
        sender: msg.sender
      });

      io.to(msg.userId).emit("receiveMessage", savedMsg);
      io.to("admin").emit("receiveMessage", savedMsg);

      if (msg.sender === "user") {
        setTimeout(async () => {
          const replyText = getAutoReply(msg.text);
          const botMsg = await Message.create({
            userId: msg.userId,
            userEmail: msg.userEmail,
            text: replyText,
            sender: "bot"
          });
          io.to(msg.userId).emit("receiveMessage", botMsg);
          io.to("admin").emit("receiveMessage", botMsg);
        }, 800);
      }

    } catch (err) {
      console.error("Socket sendMessage error:", err);
    }
  });

  /* PRODUCT ROOM — viewer count tracking */
  socket.on("joinProductRoom", ({ productId }) => {
    if (!productViewers.has(productId)) {
      productViewers.set(productId, new Set());
    }
    productViewers.get(productId).add(socket.id);
    const count = productViewers.get(productId).size;
    io.to(`product:${productId}`).emit("viewerCount", { productId, count });
    socket.join(`product:${productId}`);
  });

  socket.on("leaveProductRoom", ({ productId }) => {
    if (productViewers.has(productId)) {
      productViewers.get(productId).delete(socket.id);
      const count = productViewers.get(productId).size;
      io.to(`product:${productId}`).emit("viewerCount", { productId, count });
    }
    socket.leave(`product:${productId}`);
  });

  socket.on("disconnect", () => {
    for (const [productId, viewers] of productViewers.entries()) {
      if (viewers.has(socket.id)) {
        viewers.delete(socket.id);
        const count = viewers.size;
        io.to(`product:${productId}`).emit("viewerCount", { productId, count });
      }
    }
  });

});

/* SERVER */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});