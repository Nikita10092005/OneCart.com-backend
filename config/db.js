const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
    });

    console.log("MongoDB Connected ✅");

  } catch (error) {
    console.error("Database connection failed ❌", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;