const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit mobile number"]
    },

 profileImage: {
  type: String,
  default: ""
},
profileImagePublicId: {
  type: String,
  default: ""
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);