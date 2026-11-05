const mongoose = require("mongoose");
const Review = require("../models/Review");
const Ride = require("../models/ride");
const JoinRequest = require("../models/JoinRequest");

const REVIEW_VISIBILITY_DAYS = 14;

// Create a review
const createReview = async (req, res) => {
  const { rideId, revieweeId, rating, comment } = req.body;
  const reviewerId = req.user._id;

  if (
    !mongoose.isValidObjectId(rideId) ||
    !mongoose.isValidObjectId(revieweeId)
  ) {
    return res.status(400).json({
      message: "Invalid ride or user ID"
    });
  }

  if (reviewerId.equals(revieweeId)) {
    return res.status(400).json({
      message: "You cannot review yourself"
    });
  }

  if (
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5
  ) {
    return res.status(400).json({
      message: "Rating must be an integer between 1 and 5"
    });
  }

  if (
    comment !== undefined &&
    (typeof comment !== "string" || comment.length > 500)
  ) {
    return res.status(400).json({
      message: "Comment must be a string of at most 500 characters"
    });
  }

  const ride = await Ride.findById(rideId);

  if (!ride) {
    return res.status(404).json({
      message: "Ride not found"
    });
  }

  const now = new Date();

  if (ride.departureTime > now) {
    return res.status(403).json({
      message: "Reviews are available only after the scheduled departure time"
    });
  }

  if (ride.status === "cancelled") {
    return res.status(403).json({
      message: "Reviews are not available for cancelled rides"
    });
  }

  let eligibleRequest;

  if (ride.owner.equals(reviewerId)) {
    // Owner reviewing an completed traveler
    eligibleRequest = await JoinRequest.findOne({
      ride: rideId,
      traveler: revieweeId,
      status: "completed"
    });
  } else if (ride.owner.equals(revieweeId)) {
    // Approved traveler reviewing the owner
    eligibleRequest = await JoinRequest.findOne({
      ride: rideId,
      traveler: reviewerId,
      status: "completed"
    });
  } else {
    return res.status(403).json({
      message: "You can review only the ride owner or an approved traveler"
    });
  }

  if (!eligibleRequest) {
    return res.status(403).json({
      message: "Only approved ride participants can review each other"
    });
  }

  try {
    await Review.create({
      ride: rideId,
      reviewer: reviewerId,
      reviewee: revieweeId,
      rating,
      comment: comment ?? "",
      isPublished: false,
      publishedAt: null
    });

    const reciprocalReview = await Review.findOne({
      ride: rideId,
      reviewer: revieweeId,
      reviewee: reviewerId
    });

    let published = false;

    if (reciprocalReview) {
      await Review.updateMany(
        {
          ride: rideId,
          $or: [
            {
              reviewer: reviewerId,
              reviewee: revieweeId
            },
            {
              reviewer: revieweeId,
              reviewee: reviewerId
            }
          ]
        },
        {
          $set: {
            isPublished: true,
            publishedAt: now
          }
        }
      );

      published = true;
    }

    return res.status(201).json({
      message: published
        ? "Review submitted and both reviews are now published"
        : "Review submitted successfully. It will remain hidden until the other participant reviews or 14 days pass.",
      published
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already reviewed this user for this ride"
      });
    }

    throw error;
  }
};

// Fetch published reviews and rating statistics
const getUserReviews = async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({
      message: "Invalid user ID"
    });
  }

  const visibilityDeadline = new Date(
    Date.now() - REVIEW_VISIBILITY_DAYS * 24 * 60 * 60 * 1000
  );

  // Publish reviews once their 14-day blind period has expired.
  await Review.updateMany(
    {
      reviewee: userId,
      isPublished: { $ne: true },
      createdAt: { $lte: visibilityDeadline }
    },
    {
      $set: {
        isPublished: true,
        publishedAt: new Date()
      }
    }
  );

  const reviews = await Review.find({
    reviewee: userId,
    isPublished: true
  })
    .populate("reviewer", "name profileImage")
    .sort({ createdAt: -1 });

  const ratingStats = await Review.aggregate([
    {
      $match: {
        reviewee: new mongoose.Types.ObjectId(userId),
        isPublished: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  return res.status(200).json({
    reviews,
    averageRating: ratingStats.length
      ? Number(ratingStats[0].averageRating.toFixed(1))
      : 0,
    totalReviews: ratingStats.length
      ? ratingStats[0].totalReviews
      : 0
  });
};

module.exports = {
  createReview,
  getUserReviews
};