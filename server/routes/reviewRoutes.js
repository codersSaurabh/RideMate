const express = require("express");
const router = express.Router();

const { createReview,getUserReviews } = require("../controllers/reviewController");
const  isAuthenticated = require("../middleware/isAuthenticated");
const wrapAsync = require("../utils/wrapAsync");

router.post(
  "/",
  isAuthenticated,
  wrapAsync(createReview)
);
//to fetch review
router.get(
  "/user/:userId",
  wrapAsync(getUserReviews)
);
module.exports = router;