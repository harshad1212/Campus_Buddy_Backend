// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["student", "teacher", "admin", "superadmin"],
      default: "student",
    },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
    },
    resetToken: String,
    resetTokenExpiry: Date,
    avatarUrl: String,

    // 👇 New fields for friend system
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // received
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // sent
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
