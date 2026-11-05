const express = require("express");
const router = express.Router();
const uploadProfileImage = require("../middleware/uploadProfileImage");


const { getUserProfile,updateUserProfile,updateProfilePicture } = require("../controllers/userController");
const isAuthenticated = require("../middleware/isAuthenticated");
const wrapAsync = require("../utils/wrapAsync");

router.get("/:userId", isAuthenticated, wrapAsync(getUserProfile));
router.patch(
  "/profile",
  isAuthenticated,
  wrapAsync(updateUserProfile)
);
router.patch(
  "/profile-picture",
  isAuthenticated,
  uploadProfileImage.single("profileImage"),
  wrapAsync(updateProfilePicture)
);
module.exports = router;