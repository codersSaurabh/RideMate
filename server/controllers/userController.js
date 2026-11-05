const uploadToCloudinary = require("../utils/uploadToCloudinary");
const deleteFromCloudinary = require("../utils/deleteFromCloudinary");
const mongoose = require("mongoose");
const User = require("../models/User");
const Ride = require("../models/ride");
const JoinRequest = require("../models/JoinRequest");
const Review = require("../models/Review");

const REVIEW_VISIBILITY_DAYS = 14;

const getUserProfile = async (req, res) => {
  const { userId } = req.params;
  const { rideId } = req.query;

  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({
      message: "Invalid user ID"
    });
  }

  if (rideId && !mongoose.isValidObjectId(rideId)) {
    return res.status(400).json({
      message: "Invalid ride ID"
    });
  }

  const viewerId = req.user._id.toString();
  const isOwnProfile = viewerId === userId;

  const user = await User.findById(userId)
    .select("name email phone profileImage createdAt")
    .lean();

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  const now = new Date();

  // Check whether the viewer can see this user's phone number.
  let canViewPhone = isOwnProfile;

  if (!isOwnProfile && rideId) {
    const ride = await Ride.findById(rideId)
      .select("owner departureTime status")
      .lean();

    if (
      ride &&
      ride.status !== "cancelled" &&
      new Date(ride.departureTime) > now
    ) {
      const rideOwnerId = ride.owner.toString();

      // Viewer is the owner and profile belongs to an approved traveler.
      if (rideOwnerId === viewerId) {
        const approvedRequest = await JoinRequest.exists({
          ride: rideId,
          owner: viewerId,
          traveler: userId,
          status: "approved"
        });

        canViewPhone = Boolean(approvedRequest);
      }

      // Viewer is an approved traveler and profile belongs to the owner.
      else if (rideOwnerId === userId) {
        const approvedRequest = await JoinRequest.exists({
          ride: rideId,
          owner: userId,
          traveler: viewerId,
          status: "approved"
        });

        canViewPhone = Boolean(approvedRequest);
      }
    }
  }

  // Publish reviews after the 14-day blind review period.
  const visibilityDeadline = new Date(
    now.getTime() - REVIEW_VISIBILITY_DAYS * 24 * 60 * 60 * 1000
  );

  await Review.updateMany(
    {
      reviewee: userId,
      isPublished: { $ne: true },
      createdAt: { $lte: visibilityDeadline }
    },
    {
      $set: {
        isPublished: true,
        publishedAt: now
      }
    }
  );

  // Calculate completed and cancelled owner rides.
  const [
    completedOwnerRides,
    cancelledOwnerRides,

    completedTravelerResult,
    cancelledTravelerRequests,

    ratingStats,
    reviews
  ] = await Promise.all([

    Ride.countDocuments({
      owner: userId,
      departureTime: { $lte: now },
      status: { $ne: "cancelled" }
    }),

    Ride.countDocuments({
      owner: userId,
      status: "cancelled"
    }),

    // A traveler completes a ride only if approved
    // and the scheduled departure time has passed.
    JoinRequest.aggregate([
      {
        $match: {
          traveler: user._id,
          status: { $in: ["approved", "completed"] }
        }
      },
      {
        $lookup: {
          from: Ride.collection.name,
          localField: "ride",
          foreignField: "_id",
          as: "rideInfo"
        }
      },
      {
        $unwind: "$rideInfo"
      },
      {
        $match: {
          "rideInfo.departureTime": { $lte: now },
          "rideInfo.status": { $ne: "cancelled" }
        }
      },
      {
        $count: "total"
      }
    ]),

    JoinRequest.countDocuments({
      traveler: userId,
      status: "approved_cancelled"
    }),

    // Only published reviews contribute to rating.
    Review.aggregate([
      {
        $match: {
          reviewee: user._id,
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
    ]),

    // Return published review messages.
     isOwnProfile?(
    Review.find({
      reviewee: userId,
      isPublished: true
    })
      .populate("reviewer", "name profileImage")
      .sort({ createdAt: -1 })
      .lean()):
      (Review.find({
      reviewee: userId
      
    })
      .populate("reviewer", "name profileImage")
      .sort({ createdAt: -1 })
      .lean())
  ]);

  const completedTravelerRides =
    completedTravelerResult[0]?.total || 0;

  const totalCompletedRides =
    completedOwnerRides + completedTravelerRides;

  const totalCancellations =
    cancelledOwnerRides + cancelledTravelerRequests;

  // Never expose private fields unless authorized.
  const profileUser = {
    _id: user._id,
    name: user.name,
    profileImage: user.profileImage,
    createdAt: user.createdAt
  };

  if (isOwnProfile) {
    profileUser.email = user.email;
  }

  if (canViewPhone) {
    profileUser.phone = user.phone;
  }

  return res.status(200).json({
    user: profileUser,

    isOwnProfile,
    contactNumberVisible: canViewPhone,

    completedOwnerRides,
    cancelledOwnerRides,

    completedTravelerRides,
    cancelledTravelerRequests,

    totalCompletedRides,
    totalCancellations,

    oftenCancels: totalCancellations > totalCompletedRides,

    averageRating: ratingStats.length
      ? Number(ratingStats[0].averageRating.toFixed(1))
      : 0,

    totalReviews: ratingStats.length
      ? ratingStats[0].totalReviews
      : 0,

    reviews
  });
};
//update user
const updateUserProfile = async (req, res) => {
  const { name, phone } = req.body || {};

  const updateFields = {};

  // Validate name if provided.
  if (name !== undefined) {
    if (typeof name !== "string") {
      return res.status(400).json({
        message: "Name must be a string."
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({
        message: "Name must be between 2 and 50 characters."
      });
    }

    updateFields.name = trimmedName;
  }

  // Validate phone if provided.
  if (phone !== undefined) {
    if (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.status(400).json({
        message: "Please enter a valid 10-digit mobile number."
      });
    }

    updateFields.phone = phone.trim();
  }

  // At least one editable field must be provided.
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({
      message: "Please provide at least one field to update."
    });
  }

  // Update only the authenticated user's allowed fields.
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: updateFields
    },
    {
      new: true,
      runValidators: true
    }
  ).select("name phone profileImage createdAt");

  if (!updatedUser) {
    return res.status(404).json({
      message: "User not found."
    });
  }

  return res.status(200).json({
    message: "Profile updated successfully.",
    user: updatedUser
  });
};
//upload profile picture

const updateProfilePicture = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "Please select an image to upload."
    });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({
      message: "User not found."
    });
  }

  // Upload the new image first.
  const uploadedImage = await uploadToCloudinary(req.file.buffer);

  const oldPublicId = user.profileImagePublicId;

  // Update the database with the new image.
  user.profileImage = uploadedImage.url;
  user.profileImagePublicId = uploadedImage.publicId;

  await user.save();

  // Delete the old image only after the database update succeeds.
  if (oldPublicId) {
    try {
      await deleteFromCloudinary(oldPublicId);
    } catch (error) {
      console.error("Old profile image deletion failed:", error);
    }
  }

  return res.status(200).json({
    message: "Profile picture updated successfully.",
    profileImage: user.profileImage,
    profileImagePublicId: user.profileImagePublicId
  });
};


module.exports = {
  getUserProfile,  updateUserProfile,updateProfilePicture
};
