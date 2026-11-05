const mongoose = require("mongoose");

const joinRequestSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true
    },

    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

status: {
  type: String,
  enum: [
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "ride_cancelled",
    "completed",
    "approved_cancelled"
  ],
  default: "pending"

    },

    ticketProof: {
      type: String,
      default: ""
    },
    cancelledAt: {
  type: Date,
  default: null
},
rejectionReason: {
  type: String,
  enum: ["owner", "ride_updated", null],
  default: null
},
  },
  { timestamps: true }
);

joinRequestSchema.index(
  { ride: 1, traveler: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "JoinRequest",
  joinRequestSchema
);