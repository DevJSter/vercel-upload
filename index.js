const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const compression = require("compression");
const path = require("path");
require("dotenv").config();

// Import routes
const couponRoutes = require("./routes/couponRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminAccessCodeRoutes = require("./routes/adminAccessCodeRoutes");
const userAccessCodeRoutes = require("./routes/userAccessCodeRoutes");

// Import utilities
const errorHandler = require("./middlewares/errorHandler");

// Initialize express app
const app = express();
const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;

// Enable CORS
app.use(cors(
  {
    "origin" : "*"
  }
));

// Development logging - simplified for Vercel compatibility
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}



// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit process with failure
  });

// Set up routes
app.use("/api", couponRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", adminAccessCodeRoutes);
app.use("/api", userAccessCodeRoutes);

// Handle undefined routes
app.all("*", (req, res, next) => {
  const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  err.status = "fail";
  err.statusCode = 404;
  next(err);
});

// Global error handling middleware
app.use(errorHandler);

// Start the server
const server = app.listen(PORT, () => {
  console.log(
    `Server running in ${
      process.env.NODE_ENV || "development"
    } mode on port ${PORT}`
  );
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});
