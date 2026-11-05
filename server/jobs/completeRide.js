const cron = require("node-cron");
const Ride = require("../models/ride");
const JoinRequest = require("../models/JoinRequest");

const startRideStatusJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // STEP 1: Close open rides within 15 minutes of departure
      const closeCutoff = new Date(
        now.getTime() + 15 * 60 * 1000
      );

      const closeResult = await Ride.updateMany(
        {
          status: "open",
          departureTime: { $lte: closeCutoff }
        },
        {
          $set: { status: "closed" }
        }
      );

      // STEP 2: Complete open OR closed rides
      // when departure was at least 30 minutes ago
      const completionCutoff = new Date(
        now.getTime() - 30 * 60 * 1000
      );

      const ridesToComplete = await Ride.find({
        status: { $in: ["open", "closed"] },
        departureTime: { $lte: completionCutoff }
      }).select("_id");

      let completedCount = 0;

      for (const ride of ridesToComplete) {
        const completedRide = await Ride.findOneAndUpdate(
          {
            _id: ride._id,
            status: { $in: ["open", "closed"] },
            departureTime: { $lte: completionCutoff }
          },
          {
            $set: { status: "completed" }
          },
          { new: true }
        );

        if (completedRide) {
          await JoinRequest.updateMany(
            {
              ride: completedRide._id,
              status: "approved"
            },
            {
              $set: { status: "completed" }
            }
          );

          completedCount++;
        }
      }

      if (closeResult.modifiedCount > 0 || completedCount > 0) {
        console.log({
          ridesClosed: closeResult.modifiedCount,
          ridesCompleted: completedCount
        });
      }

    } catch (error) {
      console.error("Ride status job failed:", error);
    }
  });
};

module.exports = startRideStatusJob;