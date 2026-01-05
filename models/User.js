// models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

/* ================= POINT HISTORY ================= */
const pointHistorySchema = new Schema(
  {
    type: {
      type: String,
      enum: [
        "RESOURCE_UPLOAD",
        "RESOURCE_DOWNLOAD",
        "RESOURCE_LIKE",
        "FORUM_ANSWER",
        "FORUM_BEST_ANSWER",
        "EVENT_PARTICIPATION",
        "EVENT_WIN",
        "ADMIN_ADJUSTMENT",
        "FORUM_UPVOTE"
      ],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    refId: {
      type: Schema.Types.ObjectId,
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* ================= USER SCHEMA ================= */
const userSchema = new Schema(
  {
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

    universityId: {
      type: Schema.Types.ObjectId,
      ref: "University",
    },

    universityCode: String,
    department: String,
    course: String,
    semester: Number,

    enrollmentNumber: String,
    employeeId: String,
    designation: String,

    phone: String,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    dob: Date,
    address: String,

    avatarUrl: String,
    avatarCloudId: String,

    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],

    /* ================= POINT SYSTEM ================= */
    totalPoints: {
      type: Number,
      default: 0,
    },

    pointHistory: [pointHistorySchema],

    resetToken: String,
    resetTokenExpiry: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
