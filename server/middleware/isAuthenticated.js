const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const wrapAsync = require("../utils/wrapAsync");

const isAuthenticated = wrapAsync(async (req, res, next) => {
  
  const token = req.cookies?.token;

  if (!token) {
    throw new AppError( "Please login first",401);
  }

 
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError( "Invalid or expired token",401);
  }

  
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError( "User no longer exists",401);
  }


  req.user = user;

  
  next();
});

module.exports = isAuthenticated;