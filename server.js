require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const path = require("path");

// Use the hosting platform's DNS resolver.
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,https://onecartfrontend.netlify.app').split(',').map(s=>s.trim()).filter(Boolean);
/* Server imports */
const http = require("http");
const { Server } = require("socket.io");

const Message = require("./models/Message");
const getAutoReply = require("./utils/autoReply");

/* 🔥 PRICE ALERT SCHEDULER - TEMPORARILY DISABLED */
// require("./utils/priceAlertScheduler");

const app = express();

/* MIDDLEWARE */
app.disable('x-powered-by');
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy',Number(process.env.TRUST_PROXY_HOPS));
app.get('/api/health', (req,res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({status:mongoose.connection.readyState === 1 ? 'ok' : 'unavailable'}));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-rtb-fingerprint-id", "request-id"],
  exposedHeaders: ["x-rtb-fingerprint-id", "request-id"]
}));
app.post('/api/payment/webhook',express.raw({type:'application/json',limit:'1mb'}),require('./controllers/paymentController').handleWebhook);
app.use(express.json({limit:'1mb'}));

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
app.use('/api/newsletter',require('./routes/newsletterRoutes'));
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

app.use('/api', (req,res) => res.status(404).json({message:'API route not found'}));
app.use((err,req,res,next) => {
  if (res.headersSent) return next(err);
  const status = err.name === 'CastError' || err.name === 'ValidationError' || err.code === 'LIMIT_FILE_SIZE' ? 400 : err.status || 500;
  console.error('Request failed:',err.message);
  res.status(status).json({message:status < 500 ? err.message : 'Something went wrong. Please try again.'});
});
/* STATIC */
app.use("/uploads", express.static(path.resolve(process.env.UPLOAD_DIR || path.join(__dirname,'uploads')), {setHeaders:res=>res.setHeader('X-Content-Type-Options','nosniff')}));

/* 🔥 SOCKET SERVER SETUP */
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  }
});

const productViewers = new Map();

// Anonymous sockets may see product viewer counts, never private chat rooms.
io.use(async(socket,next)=>{
  const token=socket.handshake.auth?.token;
  if (!token) return next();
  try {
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    const user=await User.findById(decoded.id).select('email role accountStatus');
    if (!user || ['banned','suspended'].includes(user.accountStatus)) return next(new Error('Unauthorized'));
    socket.data.user={id:String(user._id),email:user.email,role:user.role};
    next();
  } catch { next(new Error('Unauthorized')); }
});
/* SOCKET LOGIC */
io.on("connection", (socket) => {

  /* USER JOIN ROOM */
  socket.on("joinRoom", (userId) => {
    if (socket.data.user?.id === userId) socket.join(userId);
  });

  /* ADMIN JOIN */
  socket.on("joinAdmin", () => {
    if (socket.data.user?.role === 'admin') socket.join('admin');
  });

  socket.on('sendMessage', async (msg) => {
    try {
      const identity = socket.data.user;
      if (!identity || typeof msg?.text !== 'string' || !msg.text.trim() || msg.text.length > 2000) return;
      const current = await User.findById(identity.id).select('role accountStatus');
      if (!current || ['banned','suspended'].includes(current.accountStatus)) return;
      const admin = current.role === 'admin';
      if (admin && !mongoose.isValidObjectId(msg.userId)) return;
      const recipient = admin ? await User.findById(msg.userId).select('email') : null;
      if (admin && !recipient) return;
      msg = {userId:admin ? msg.userId : identity.id,userEmail:admin ? recipient.email : identity.email,text:msg.text.trim(),sender:admin ? 'bot' : 'user'};
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
          try {
          const replyText = getAutoReply(msg.text);
          const botMsg = await Message.create({
            userId: msg.userId,
            userEmail: msg.userEmail,
            text: replyText,
            sender: "bot"
          });
          io.to(msg.userId).emit("receiveMessage", botMsg);
          io.to("admin").emit("receiveMessage", botMsg);
          } catch(e) { console.error('Chat reply:',e.message); }
        }, 800);
      }

    } catch (err) {
      console.error("Socket sendMessage error:", err);
    }
  });

  /* PRODUCT ROOM — viewer count tracking */
  socket.on("joinProductRoom", ({ productId } = {}) => {
    if (!mongoose.isValidObjectId(productId)) return;
    socket.join(`product:${productId}`);
    if (!productViewers.has(productId)) {
      productViewers.set(productId, new Set());
    }
    productViewers.get(productId).add(socket.id);
    const count = productViewers.get(productId).size;
    io.to(`product:${productId}`).emit("viewerCount", { productId, count });
    socket.join(`product:${productId}`);
  });

  socket.on("leaveProductRoom", ({ productId } = {}) => {
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
        if (!count) productViewers.delete(productId);
      }
    }
  });

});

/* SERVER */
const PORT = process.env.PORT || 5000;

async function start() {
  for (const key of ['MONGO_URI','JWT_SECRET']) if (!process.env[key]) throw new Error(key+' must be configured');
  await connectDB();
  server.listen(PORT, () => console.log('Server running on port '+PORT));
}
start().catch(error=>{console.error('Startup failed:',error.message);process.exit(1);});
process.on('SIGTERM',()=>server.close(()=>mongoose.disconnect().finally(()=>process.exit(0))));
