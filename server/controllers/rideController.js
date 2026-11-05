const mongoose = require("mongoose");
const JoinRequest = require("../models/JoinRequest");
const Ride = require("../models/ride");
const Notification = require("../models/Notification");
const AppError=require("../utils/AppError");
//to create ride
const createRide = async (req, res) => {

    const { from, to, date, time, maxSeats } = req.body;

const departure = new Date(`${date}T${time}:00+05:30`);

if (
  Number.isNaN(departure.getTime()) ||
  departure.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata"
  }) !== date
) {
  return res.status(400).json({
    message: "Invalid departure date or time"
  });
}

const oneHour = 60 * 60 * 1000;

if (departure.getTime() - Date.now() < oneHour) {
  return res.status(400).json({
    message: "Ride must be created at least 1 hour before departure"
  });
}

const ride = await Ride.create({
  owner: req.user._id,
  from,
  to,
  departureTime: departure,
  maxSeats,
  availableSeats: maxSeats,
  status: "open"
});

res.status(201).json({
  message: "Ride created successfully",
  ride
});
};
//to get
const getRides = async (req, res) => {
  const { from, to, date } = req.query;
 
     const cutoff = new Date(Date.now() + 30 * 60 * 1000);
 
     const filter = {
       status: "open",
       availableSeats: { $gt: 0 },
       departureTime: { $gt: cutoff }
     };
 
     if (from) {
       filter.from = {
         $regex: from,
         $options: "i"
       };
     }
 
     if (to) {
       filter.to = {
         $regex: to,
         $options: "i"
       };
     }
 
    if (date) {
   if (
     typeof date !== "string" ||
     !/^\d{4}-\d{2}-\d{2}$/.test(date)
   ) {
     return res.status(400).json({
       message: "Invalid travel date"
     });
   }
 
   const start = new Date(`${date}T00:00:00+05:30`);
 
   if (
     Number.isNaN(start.getTime()) ||
     start.toLocaleDateString("en-CA", {
       timeZone: "Asia/Kolkata"
     }) !== date
   ) {
     return res.status(400).json({
       message: "Invalid travel date"
     });
   }
 
   const end = new Date(
     start.getTime() + 24 * 60 * 60 * 1000
   );
 
   filter.departureTime = {
     $gte: start > cutoff ? start : cutoff,
     $lt: end
   };
 }
 
     const rides = await Ride.find(filter)
       .populate("owner", "name profileImage")
       .sort({ departureTime: 1 });
 
     res.status(200).json({
       message: "Rides fetched successfully",
       rides
     });
   
};
//get my published rides
const getMyRides = async (req, res) => {
  const rides = await Ride.find({
    owner: req.user._id
  }).sort({ departureTime: -1 });

  res.status(200).json({
    message: "Your rides fetched successfully",
    rides
  });
};

//get by id
const getRideById = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid ride ID"
    });
  }

  let ride = await Ride.findById(id)
    .populate("owner", "name profileImage");

  if (!ride) {
    return res.status(404).json({
      message: "Ride not found"
    });
  }

  const departureTime = new Date(ride.departureTime).getTime();

  // Only automatically complete rides that are still open.
  if (
    ride.status === "open" &&
    Number.isFinite(departureTime) &&
    departureTime <= Date.now()
  ) {
    ride.status = "completed";
    await ride.save();
  }

  res.status(200).json({
    message: "Ride fetched successfully",
    ride
  });
};
//update an existing ride
const updateRide = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid ride ID"
    });
  }

  let updatedRide;
  let rejectedCount = 0;
  let hasChanges = false;

  await mongoose.connection.transaction(async (session) => {
    const ride = await Ride.findById(id).session(session);

    if (!ride) {
      throw new AppError("Ride not found", 404);
    }

    if (!ride.owner.equals(req.user._id)) {
      throw new AppError(
        "You can only update your own ride",
        403
      );
    }

    if (ride.status !== "open") {
      throw new AppError(
        "Only open rides can be edited",
        400
      );
    }

    if (ride.availableSeats !== ride.maxSeats) {
      throw new AppError(
        "Cannot edit a ride while travelers are approved",
        400
      );
    }

    const existingDate = ride.departureTime.toLocaleDateString(
      "en-CA",
      { timeZone: "Asia/Kolkata" }
    );

    const existingTime = ride.departureTime.toLocaleTimeString(
      "en-GB",
      {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      }
    );

    const date = req.body.date ?? existingDate;
    const time = req.body.time ?? existingTime;

    const updatedDeparture = new Date(
      `${date}T${time}:00+05:30`
    );

    if (
      Number.isNaN(updatedDeparture.getTime()) ||
      updatedDeparture.toLocaleDateString(
        "en-CA",
        { timeZone: "Asia/Kolkata" }
      ) !== date ||
      updatedDeparture.toLocaleTimeString(
        "en-GB",
        {
          timeZone: "Asia/Kolkata",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit"
        }
      ) !== time
    ) {
      throw new AppError(
        "Invalid departure date or time",
        400
      );
    }

    if (
      updatedDeparture.getTime() - Date.now() <
      60 * 60 * 1000
    ) {
      throw new AppError(
        "Departure must be at least one hour away",
        400
      );
    }

    const newFrom = req.body.from ?? ride.from;
    const newTo = req.body.to ?? ride.to;
    const newMaxSeats = req.body.maxSeats ?? ride.maxSeats;

    const routeOrTimeChanged =
      newFrom !== ride.from ||
      newTo !== ride.to ||
      updatedDeparture.getTime() !== ride.departureTime.getTime();

    const seatsChanged = newMaxSeats !== ride.maxSeats;

    hasChanges = routeOrTimeChanged || seatsChanged;

    // Nothing changed: do not reject requests or send notifications.
    if (!hasChanges) {
      updatedRide = ride;
      return;
    }

    // Save the current pending requests only if route/time changes,
    // so we can notify the affected travelers after rejecting them.
    let pendingRequests = [];

    if (routeOrTimeChanged) {
      pendingRequests = await JoinRequest.find({
        ride: ride._id,
        status: "pending"
      }).session(session);
    }

    ride.from = newFrom;
    ride.to = newTo;
    ride.maxSeats = newMaxSeats;
    ride.availableSeats = newMaxSeats;
    ride.departureTime = updatedDeparture;

    updatedRide = await ride.save({ session });

    // Seat-only updates do not affect existing requests.
    if (!routeOrTimeChanged) {
      return;
    }

    const result = await JoinRequest.updateMany(
      {
        ride: ride._id,
        status: "pending"
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: "ride_updated"
        }
      },
      { session }
    );

    rejectedCount = result.modifiedCount;

    if (pendingRequests.length > 0) {
      const notifications = pendingRequests.map((request) => ({
        recipient: request.traveler,
        sender: req.user._id,
        ride: ride._id,
        type: "ride_updated",
        message: `The ride from ${newFrom} to ${newTo} has been updated. Your previous join request was rejected. You can send a new request.`
      }));

      await Notification.insertMany(notifications, {
        session
      });
    }
  });

  return res.status(200).json({
    message: hasChanges
      ? "Ride updated successfully"
      : "No changes detected",
    ride: updatedRide,
    rejectedRequests: rejectedCount
  });
};
//close an open ride

const closeRide = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid ride ID"
    });
  }

  const ride = await Ride.findById(id);

  if (!ride) {
    return res.status(404).json({
      message: "Ride not found"
    });
  }

  if (!ride.owner.equals(req.user._id)) {
    return res.status(403).json({
      message: "You cannot close another user's ride"
    });
  }

  const updatedRide = await Ride.findOneAndUpdate(
    {
      _id: id,
      owner: req.user._id,
      status: "open",
      departureTime: { $gt: new Date() }
    },
    {
      $set: { status: "closed" }
    },
    {
      returnDocument: "after"
    }
  );

  if (!updatedRide) {
    return res.status(409).json({
      message: "Ride is no longer available for closing"
    });
  }

  return res.status(200).json({
    message: "Ride closed successfully",
    ride: updatedRide
  });
};

//cancel an ride
const cancelRide = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({
      message: "Invalid ride ID"
    });
  }

  let updatedRide;

  await mongoose.connection.transaction(async (session) => {
    const ride = await Ride.findById(id).session(session);

    if (!ride) {
      throw new AppError("Ride not found", 404);
    }

    if (!ride.owner.equals(req.user._id)) {
      throw new AppError(
        "You cannot cancel another user's ride",
        403
      );
    }

    if (ride.status === "cancelled") {
      throw new AppError("Ride is already cancelled", 400);
    }

    if (
      ride.status === "expired" ||
      ride.departureTime.getTime() <= Date.now()
    ) {
      throw new AppError(
        "Cannot cancel a ride after departure",
        400
      );
    }

    const requests = await JoinRequest.find({
      ride: ride._id,
      status: { $in: ["pending", "approved"] }
    }).session(session);

    ride.status = "cancelled";
    ride.availableSeats = 0;

    updatedRide = await ride.save({ session });

    await JoinRequest.updateMany(
      {
        ride: ride._id,
        status: { $in: ["pending", "approved"] }
      },
      {
        $set: { status: "ride_cancelled" }
      },
      { session }
    );

    if (requests.length > 0) {
      const notifications = requests.map((request) => ({
        recipient: request.traveler,
        sender: req.user._id,
        ride: ride._id,
        type: "ride_cancelled",
        message: `Your ride from ${ride.from} to ${ride.to} has been cancelled by the owner.`
      }));

      await Notification.insertMany(notifications, {
        session
      });
    }
  });

  return res.status(200).json({
    message: "Ride cancelled successfully",
    ride: updatedRide
  });
};

module.exports = {
  createRide,
  getRides,
  getMyRides,
  getRideById,
  updateRide,
  closeRide,
  cancelRide
};