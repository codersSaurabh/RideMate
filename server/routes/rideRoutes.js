const express = require("express");
const router = express.Router();
const {
  createRide,
  getRides,
  getMyRides,
  getRideById,
  updateRide,
  closeRide,
  cancelRide
}=require("../controllers/rideController");
const  isAuthenticated  = require("../middleware/isAuthenticated");
const validate = require("../middleware/validate");
const { rideSchema,updateRideSchema } = require("../schemas/rideSchema");
const wrapAsync = require("../utils/wrapAsync");

router.post(
  "/",
  isAuthenticated,
  validate(rideSchema),
  wrapAsync(createRide));
//to fetch rides
router.get(
  "/",
  wrapAsync(getRides)
);
//fetch my rides
router.get(
  "/my-rides",
  isAuthenticated,
  wrapAsync(getMyRides)
);

//to select by id
router.get(
  "/:id",
  wrapAsync(getRideById)
);

//update ride
router.patch(
  "/:id",
  isAuthenticated,
  validate(updateRideSchema),
  wrapAsync(updateRide)
);

//close ride
router.patch(
  "/:id/close",
  isAuthenticated,
  wrapAsync(closeRide)
);

//to cancel the ride
router.patch("/:id/cancel",isAuthenticated,wrapAsync(cancelRide));



module.exports = router;