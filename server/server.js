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

// Import background job
const startRideCompletionJob = require("./jobs/completeRide");

const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "server and mongoose working properly with react",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/join-requests", joinRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);

app.use(errorHandler);

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Start scheduled background task
  startRideCompletionJob();

  app.listen(port, () => {
    console.log(`server running at port ${port}`);
  });
};

startServer();