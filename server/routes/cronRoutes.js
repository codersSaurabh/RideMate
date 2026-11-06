
const express = require("express");
const runRideCompletionJob = require("../jobs/completeRide");

const router = express.Router();

router.post("/complete-rides", async (req, res, next) => {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return res.status(500).json({
        success: false,
        message: "Cron secret is not configured",
      });
    }

    const authorization = req.headers.authorization;

    if (authorization !== `Bearer ${cronSecret}`) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized cron request",
      });
    }

    const result = await runRideCompletionJob();

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
