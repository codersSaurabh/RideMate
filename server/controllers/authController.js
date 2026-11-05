const User = require("../models/User");
const bcrypt = require("bcrypt");
const AppError = require("../utils/AppError");
const generateToken = require("../utils/generateToken");

const signup = async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    phone
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  });
};
//login
const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new AppError( "Invalid email or password",401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError( "Invalid email or password",401);
  }
  const token = generateToken(user._id);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  res.status(200).json({
    success: true,
    message: "Login successful",
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage
    }
  });
};
//logout
const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  res.status(200).json({
    success: true,
    message: "Logout successful"
  });
};
//getme
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      profileImage: req.user.profileImage
    }
  });
};

module.exports = { signup,login,getMe,logout };