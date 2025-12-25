// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    /* ================= AUTH ================= */
    role: {
      type: String,
      enum: ["student", "teacher", "admin", "superadmin"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    /* ================= UNIVERSITY ================= */
    universityId: {
      type: Schema.Types.ObjectId,
      ref: "University",
      required: false, // superadmin has no university
    },

    universityCode: {
      type: String,
    },

    department: {
      type: String,
    },

    course: {
      type: String,
    },

    semester: {
      type: Number, // student
    },

    /* ================= ROLE-SPECIFIC ================= */
    enrollmentNumber: {
      type: String, // student
    },

    employeeId: {
      type: String, // teacher
    },

    designation: {
      type: String, // teacher
    },

    /* ================= PERSONAL ================= */
    phone: {
      type: String,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    dob: {
      type: Date,
    },

    address: {
      type: String,
    },

    /* ================= MEDIA ================= */
    avatarUrl: {
      type: String,
    },

    avatarCloudId: {
      type: String,
    },

    /* ================= SOCIAL ================= */
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],

    /* ================= META ================= */
    resetToken: String,
    resetTokenExpiry: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
