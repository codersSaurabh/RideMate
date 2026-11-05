const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const Ride = require("../models/ride");
const JoinRequest = require("../models/JoinRequest");
const AppError=require("../utils/AppError");
const Review=require("../models/Review");

const sendJoinRequest = async (req, res) => {
  const { rideId } = req.params;
  const travelerId = req.user._id;

  if (!mongoose.isValidObjectId(rideId)) {
    throw new AppError("Invalid ride ID", 400);
  }

  let joinRequest;
  let isResubmission = false;

  await mongoose.connection.transaction(async (session) => {
    const now = new Date();
    const twoHours = 2 * 60 * 60 * 1000;
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);

    // 1. Find ride
    const ride = await Ride.findById(rideId).session(session);

    if (!ride) {
      throw new AppError("Ride not found", 404);
    }

    // 2. Prevent owner from joining own ride
    if (ride.owner.equals(travelerId)) {
      throw new AppError("You cannot join your own ride", 403);
    }

    // 3. Check ride status
    if (ride.status !== "open") {
      throw new AppError("This ride is not accepting requests", 400);
    }

    // 4. Check available seats
    if (ride.availableSeats <= 0) {
      throw new AppError("No seats available", 400);
    }

    // 5. Check departure time
    if (ride.departureTime <= thirtyMinutesLater) {
      throw new AppError(
        "You cannot join a ride within 30 minutes of departure",
        400
      );
    }

    // 6. Check existing request for this ride
    const existingRequest = await JoinRequest.findOne({
      ride: rideId,
      traveler: travelerId
    }).session(session);

    if (existingRequest) {
      if (["pending", "approved"].includes(existingRequest.status)) {
        throw new AppError(
          "You have already requested or joined this ride",
          409
        );
      }

      if (existingRequest.status === "cancelled") {
        throw new AppError(
          "You cannot reapply to a ride you previously cancelled",
          409
        );
      }

      if (
        existingRequest.status !== "rejected" ||
        existingRequest.rejectionReason !== "ride_updated"
      ) {
        throw new AppError(
          "You cannot reapply to this ride",
          409
        );
      }

      isResubmission = true;
    }

    // 7. Check other upcoming active bookings by this traveler
    const activeRequests = await JoinRequest.find({
      traveler: travelerId,
      status: { $in: ["pending", "approved"] },
      ride: { $ne: rideId }
    })
      .populate({
        path: "ride",
        select: "departureTime"
      })
      .session(session);

    const conflictingRequest = activeRequests.find((request) => {
      if (!request.ride || !request.ride.departureTime) {
        return false;
      }

      const existingDeparture = new Date(
        request.ride.departureTime
      );

      // Ignore rides that have already departed
      if (existingDeparture <= now) {
        return false;
      }

      const timeDifference = Math.abs(
        existingDeparture.getTime() -
        ride.departureTime.getTime()
      );

      return timeDifference < twoHours;
    });

    if (conflictingRequest) {
      throw new AppError(
        "You already have another active ride booking within 2 hours of this departure time",
        409
      );
    }

    // 8. Coordinate concurrent requests through the ride document
    const currentRide = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        status: "open",
        availableSeats: { $gt: 0 },
        departureTime: { $gt: thirtyMinutesLater }
      },
      {
        $set: {
          updatedAt: new Date()
        }
      },
      {
        new: true,
        session
      }
    );

    if (!currentRide) {
      throw new AppError(
        "This ride is no longer accepting requests",
        409
      );
    }

    // 9. Check request queue capacity
    const activeRequestCount = await JoinRequest.countDocuments({
      ride: rideId,
      status: { $in: ["pending", "approved"] }
    }).session(session);

    if (activeRequestCount >= currentRide.maxSeats) {
      throw new AppError(
        "This ride's request queue is full. Please try again if a request is rejected or cancelled.",
        409
      );
    }

    // 10. Create or resubmit join request
    if (isResubmission) {
      existingRequest.status = "pending";
      existingRequest.rejectionReason = null;
      existingRequest.cancelledAt = null;

      await existingRequest.save({ session });

      joinRequest = existingRequest;
    } else {
      const [newRequest] = await JoinRequest.create(
        [
          {
            ride: rideId,
            traveler: travelerId,
            owner: ride.owner,
            status: "pending"
          }
        ],
        { session }
      );

      joinRequest = newRequest;
    }

    // 11. Notify ride owner
    await Notification.create(
      [
        {
          recipient: ride.owner,
          sender: travelerId,
          ride: rideId,
          type: "join_requested",
          message: "Someone has requested to join your ride."
        }
      ],
      { session }
    );
  });

  return res.status(isResubmission ? 200 : 201).json({
    message: isResubmission
      ? "Join request submitted again successfully"
      : "Join request sent successfully",
    joinRequest
  });
};

//get request for an particular ride

const getRideJoinRequests = async (req, res) => {
  const { rideId } = req.params;

  if (!mongoose.isValidObjectId(rideId)) {
    return res.status(400).json({
      message: "Invalid ride ID"
    });
  }

  const ride = await Ride.findById(rideId);

  if (!ride) {
    return res.status(404).json({
      message: "Ride not found"
    });
  }

  if (!ride.owner.equals(req.user._id)) {
    return res.status(403).json({
      message: "Only the ride owner can view join requests"
    });
  }

  const requests = await JoinRequest.find({
    ride: rideId
  })
    .populate("traveler", "name email profileImage")
    .sort({ createdAt: -1 })
    .lean();

  // Find all travelers whom the owner has already reviewed.
  const reviews = await Review.find({
    ride: rideId,
    reviewer: req.user._id
  }).select("reviewee");

  const reviewedTravelers = new Set(
    reviews.map((review) => review.reviewee.toString())
  );

  // Add reviewedByYou to every request.
  const updatedRequests = requests.map((request) => ({
    ...request,
    reviewedByYou: request.traveler
      ? reviewedTravelers.has(request.traveler._id.toString())
      : false
  }));

  res.status(200).json({
    message: "Join requests fetched successfully",
    totalRequests: updatedRequests.length,
    requests: updatedRequests
  });
};


//aprove an request
const approveJoinRequest = async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      message: "Invalid request ID"
    });
  }

  let updatedRequest;
  let updatedRide;

  await mongoose.connection.transaction(async (session) => {
    const joinRequest = await JoinRequest.findById(requestId)
      .session(session);

    if (!joinRequest) {
      throw new AppError("Join request not found", 404);
    }

    if (!joinRequest.owner.equals(req.user._id)) {
      throw new AppError("Only the ride owner can approve requests", 403);
    }

    if (joinRequest.status !== "pending") {
      throw new AppError("This request is no longer pending", 409);
    }

    updatedRequest = await JoinRequest.findOneAndUpdate(
      {
        _id: requestId,
        owner: req.user._id,
        status: "pending"
      },
      {
        $set: { status: "approved" }
      },
      { new: true, session }
    );

    if (!updatedRequest) {
      throw new AppError("Request is no longer pending", 409);
    }

    updatedRide = await Ride.findOneAndUpdate(
      {
        _id: updatedRequest.ride,
        owner: req.user._id,
        status:  { $in: ["open", "closed"] },
        availableSeats: { $gt: 0 },
        departureTime: {
          $gt: new Date(Date.now() + 30 * 60 * 1000)
        }
      },
      {
        $inc: { availableSeats: -1 }
      },
      { returnDocument: "after", session }
    );

    if (!updatedRide) {
      throw new AppError("Ride is no longer available", 400);
    }

    await Notification.create(
      [
        {
          recipient: updatedRequest.traveler,
          sender: req.user._id,
          ride: updatedRide._id,
          type: "join_approved",
          message: `Your join request for the ride from ${updatedRide.from} to ${updatedRide.to} has been approved.`
        }
      ],
      { session }
    );
  });

  return res.status(200).json({
    message: "Join request approved successfully",
    joinRequest: updatedRequest,
    availableSeats: updatedRide.availableSeats
  });
};
//reject ride request
const rejectJoinRequest = async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      message: "Invalid request ID"
    });
  }

  let updatedRequest;

  await mongoose.connection.transaction(async (session) => {
    const joinRequest = await JoinRequest.findById(requestId)
      .session(session);

    if (!joinRequest) {
      throw new AppError("Join request not found", 404);
    }

    if (!joinRequest.owner.equals(req.user._id)) {
      throw new AppError(
        "Only the ride owner can reject requests",
        403
      );
    }

    if (joinRequest.status !== "pending") {
      throw new AppError(
        "Only pending requests can be rejected",
        409
      );
    }

    const ride = await Ride.findById(joinRequest.ride)
      .session(session);

    if (!ride || ride.status !== "open") {
      throw new AppError("Ride is no longer available", 400);
    }

    updatedRequest = await JoinRequest.findOneAndUpdate(
      {
        _id: requestId,
        owner: req.user._id,
        status: "pending"
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: "owner"
        }
      },
      { new: true, session }
    );

    if (!updatedRequest) {
      throw new AppError("Request is no longer pending", 409);
    }

    await Notification.create(
      [
        {
          recipient: updatedRequest.traveler,
          sender: req.user._id,
          ride: ride._id,
          type: "join_rejected",
          message: `Your join request for the ride from ${ride.from} to ${ride.to} was rejected by the owner.`
        }
      ],
      { session }
    );
  });

  return res.status(200).json({
    message: "Join request rejected successfully",
    joinRequest: updatedRequest
  });
};

//cancel the requested join
const cancelJoinRequest = async (req, res) => {
  const { requestId } = req.params;

  if (!mongoose.isValidObjectId(requestId)) {
    return res.status(400).json({
      message: "Invalid request ID"
    });
  }

  let updatedRequest;
  let updatedRide;

  await mongoose.connection.transaction(async (session) => {
    const joinRequest = await JoinRequest.findById(requestId)
      .session(session);

    if (!joinRequest) {
      throw new AppError("Join request not found", 404);
    }

    if (!joinRequest.traveler.equals(req.user._id)) {
      throw new AppError(
        "You can only cancel your own request",
        403
      );
    }

    if (!["pending", "approved"].includes(joinRequest.status)) {
      throw new AppError(
        "This request cannot be cancelled",
        409
      );
    }

    const ride = await Ride.findById(joinRequest.ride)
      .session(session);

    if (!ride) {
      throw new AppError("Ride not found", 404);
    }

    if (ride.departureTime <= new Date()) {
      throw new AppError(
        "Cannot cancel after departure",
        400
      );
    }

    if (["cancelled", "expired"].includes(ride.status)) {
      throw new AppError("Ride is no longer active", 400);
    }

    const wasApproved = joinRequest.status === "approved";

    const newRequestStatus = wasApproved
      ? "approved_cancelled"
      : "cancelled";

    updatedRequest = await JoinRequest.findOneAndUpdate(
      {
        _id: requestId,
        traveler: req.user._id,
        status: joinRequest.status
      },
      {
        $set: {
          status: newRequestStatus,
          cancelledAt: new Date()
        }
      },
      { new: true, session }
    );

    if (!updatedRequest) {
      throw new AppError(
        "Request is no longer available for cancellation",
        409
      );
    }

    if (wasApproved) {
      updatedRide = await Ride.findOneAndUpdate(
        {
          _id: ride._id,
          status: { $in: ["open", "closed"] },
          departureTime: { $gt: new Date() },
          availableSeats: { $lt: ride.maxSeats }
        },
        {
          $inc: { availableSeats: 1 }
        },
        { new: true, session }
      );

      if (!updatedRide) {
        throw new AppError("Unable to restore seat", 409);
      }
    } else {
      updatedRide = ride;
    }

    await Notification.create(
      [
        {
          recipient: ride.owner,
          sender: req.user._id,
          ride: ride._id,
          type: "traveler_cancelled",
          message: wasApproved
            ? `A confirmed traveler has cancelled their seat on your ride from ${ride.from} to ${ride.to}.`
            : `A traveler has withdrawn their join request for your ride from ${ride.from} to ${ride.to}.`
        }
      ],
      { session }
    );
  });

  return res.status(200).json({
    message: "Join request cancelled successfully",
    joinRequest: updatedRequest,
    availableSeats: updatedRide.availableSeats
  });
};

//get my requested rides

const getMyRequests = async (req, res) => {
  const requests = await JoinRequest.find({
    traveler: req.user._id
  })
    .populate({
      path: "ride",
      select: "from to departureTime status owner",
      populate: {
        path: "owner",
        select: "name"
      }
    })
    .sort({ createdAt: -1 })
    .lean();

  // Get all ride IDs
  const rideIds = requests
    .filter(request => request.ride)
    .map(request => request.ride._id);

  // Find reviews submitted by the logged-in traveler
  const reviews = await Review.find({
    reviewer: req.user._id,
    ride: { $in: rideIds }
  }).select("ride reviewee");

  // Create lookup for reviewed ride-owner pairs
  const reviewedPairs = new Set(
    reviews.map(review =>
      `${review.ride.toString()}_${review.reviewee.toString()}`
    )
  );

  // Add reviewedByYou to each request
  const updatedRequests = requests.map(request => {
    const ownerId = request.ride?.owner?._id;

    const reviewedByYou = ownerId
      ? reviewedPairs.has(
          `${request.ride._id.toString()}_${ownerId.toString()}`
        )
      : false;

    return {
      ...request,
      reviewedByYou
    };
  });

  res.status(200).json({
    requests: updatedRequests
  });
};

module.exports = { sendJoinRequest, getRideJoinRequests,approveJoinRequest,rejectJoinRequest,getMyRequests,cancelJoinRequest };