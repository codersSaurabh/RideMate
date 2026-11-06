
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
require("dotenv").config();

const errorHandler = require("./middleware/errorHandler");
const authRoutes = require("./routes/authRoutes");
const cookieParser = require("cookie-parser");
const rideRoutes = require("./routes/rideRoutes");
const joinRequestRoutes = require("./routes/joinRequestRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const cronRoutes = require("./routes/cronRoutes");

const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

// MongoDB connection middleware
let dbConnection;

app.use(async (req, res, next) => {
  try {
    if (!dbConnection) {
      dbConnection = connectDB();
    }

    await dbConnection;
    next();
  } catch (error) {
    dbConnection = null;
    next(error);
  }
});

// Test route
app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "server and mongoose working properly with react",
  });
});

// API routes
app.use("/api/cron", cronRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/join-requests", joinRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

// Error handler
app.use(errorHandler);

// Export Express application for Vercel
module.exports = app;

// Local development
if (require.main === module) {
  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    console.log(`server running at port ${port}`);
  });
}
