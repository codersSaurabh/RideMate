
const express = require("express");
const { signup,login,getMe,logout } = require("../controllers/authController");
const {signupSchema,loginSchema}=require("../schemas/authSchema");
const validate=require("../middleware/validate");
const isAuthenticated=require("../middleware/isAuthenticated");
const wrapAsync =require("../utils/wrapAsync");
const router = express.Router();

router.post("/signup",validate(signupSchema), wrapAsync(signup));
//login
router.post("/login",validate(loginSchema),wrapAsync(login))
//get me
router.get("/me",isAuthenticated,wrapAsync(getMe));
//logout
router.post('/logout',isAuthenticated,wrapAsync(logout));
module.exports = router;
