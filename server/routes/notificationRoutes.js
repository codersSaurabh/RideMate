const express = require("express");
const router = express.Router();

const  isAuthenticated  = require("../middleware/isAuthenticated");
const wrapAsync = require("../utils/wrapAsync");

const {
  getMyNotifications,
  markAsRead
} = require("../controllers/notificationController");

router.get(
  "/",
  isAuthenticated,
  wrapAsync(getMyNotifications)
);

router.patch(
  "/:notificationId/read",
  isAuthenticated,
  wrapAsync(markAsRead)
);

module.exports = router;