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
        "EVENT_PARTICIPATION",
        "EVENT_WIN",
        "ADMIN_ADJUSTMENT",
      ],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    refId: {
      type: Schema.Types.ObjectId, // resourceId, questionId, eventId, etc.
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

    universityCode: String,
    department: String,
    course: String,
    semester: Number,

    /* ================= ROLE-SPECIFIC ================= */
    enrollmentNumber: String, // student
    employeeId: String,       // teacher
    designation: String,      // teacher

    /* ================= PERSONAL ================= */
    phone: String,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    dob: Date,
    address: String,

    /* ================= MEDIA ================= */
    avatarUrl: String,
    avatarCloudId: String,

    /* ================= SOCIAL ================= */
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

    /* ================= META ================= */
    resetToken: String,
    resetTokenExpiry: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
