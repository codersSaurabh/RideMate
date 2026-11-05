const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    from: {
      type: String,
      required: true,
      trim: true
    },

    to: {
      type: String,
      required: true,
      trim: true
    },

    departureTime: {
      type: Date,
      required: true
    },

    maxSeats: {
      type: Number,
      required: true,
      min: 1
    },

    availableSeats: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["open", "closed", "cancelled", "expired","completed"],
      default: "open"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", rideSchema);