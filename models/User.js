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
      required: false, // ✅ for superadmin (no university)
    },
    resetToken: String,
    resetTokenExpiry: Date,
    avatarUrl: String,

    // 👇 THIS IS THE IMPORTANT FIX
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
