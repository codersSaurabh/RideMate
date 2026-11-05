const express = require("express");

const router = express.Router();

const {
  sendJoinRequest,
  getRideJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  cancelJoinRequest,
  getMyRequests,
} = require("../controllers/joinRequestController");

const isAuthenticated = require("../middleware/isAuthenticated");
const wrapAsync = require("../utils/wrapAsync");

router.post("/:rideId/join", isAuthenticated, wrapAsync(sendJoinRequest));
//to get rides joining requrest associated to a owner
router.get("/ride/:rideId", isAuthenticated, wrapAsync(getRideJoinRequests));
//to approve the ride request
router.patch(
  "/:requestId/approve",
  isAuthenticated,
  wrapAsync(approveJoinRequest),
);
//reject ride request
router.patch(
  "/:requestId/reject",
  isAuthenticated,
  wrapAsync(rejectJoinRequest),
);
//cancel the requested join
router.patch(
  "/:requestId/cancel",
  isAuthenticated,
  wrapAsync(cancelJoinRequest),
);
//my requests
router.get(
  "/my-requests",
  isAuthenticated,
  wrapAsync(getMyRequests)
);
module.exports = router;
