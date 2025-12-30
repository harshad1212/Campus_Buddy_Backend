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
      required: false,
    },

    avatarUrl: String,
    resetToken: String,
    resetTokenExpiry: Date,

    isApproved: {
      type: Boolean,
      default: false,
    },

    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ⭐ LEADERBOARD POINT SYSTEM
    points: {
      total: {
        type: Number,
        default: 0,
      },

      breakdown: {
        resourceUpload: { type: Number, default: 0 },
        resourceDownload: { type: Number, default: 0 },
        resourceLike: { type: Number, default: 0 },

        forumAnswer: { type: Number, default: 0 },
        forumBestAnswer: { type: Number, default: 0 },

        eventParticipation: { type: Number, default: 0 },
        eventWin: { type: Number, default: 0 },
      },

      history: [pointHistorySchema], // optional but recommended
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
