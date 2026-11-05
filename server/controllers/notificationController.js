const mongoose = require("mongoose");
const Notification = require("../models/Notification");

const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({
    recipient: req.user._id
  })
    .sort({ createdAt: -1 })
    .limit(50);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false
  });

  res.status(200).json({
    notifications,
    unreadCount
  });
};

const markAsRead = async (req, res) => {
  const { notificationId } = req.params;

  if (!mongoose.isValidObjectId(notificationId)) {
    return res.status(400).json({
      message: "Invalid notification ID"
    });
  }

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: req.user._id
    },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json({
      message: "Notification not found"
    });
  }

  res.status(200).json({
    message: "Notification marked as read",
    notification
  });
};

module.exports = {
  getMyNotifications,
  markAsRead
};