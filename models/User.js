const mongoose = require("mongoose");
const { Schema } = mongoose;

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
    },
    points: Number,
    refId: {
      type: mongoose.Schema.Types.ObjectId, // resourceId, questionId, eventId, etc.
    },
    description: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new Schema(
  {
    /* ================= AUTH ================= */
    role: {
      type: String,
      enum: ["student", "teacher", "admin", "superadmin"],
      required: true,
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

    isApproved: {
      type: Boolean,
      default: false,
    },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
