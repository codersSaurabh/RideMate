const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      default: null
    },

    type: {
      type: String,
      enum: [
        "join_requested",
        "join_approved",
        "join_rejected",
        "ride_updated",
        "ride_cancelled",
        "traveler_cancelled"
      ],
      required: true
    },

    message: {
      type: String,
      required: true
    },

    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);