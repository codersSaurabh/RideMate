
const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true
    },

    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    // Blind review visibility
    isPublished: {
      type: Boolean,
      default: false
    },

    publishedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

reviewSchema.index(
  { ride: 1, reviewer: 1, reviewee: 1 },
  { unique: true }
);

module.exports = mongoose.model("Review", reviewSchema);
