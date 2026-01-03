const mongoose = require("mongoose");
const { Schema } = mongoose;

const eventSchema = new Schema(
  {
    /* ================= BASIC INFO ================= */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    /* ================= DATE & TIME ================= */
    date: {
      type: Date,
      required: true,
    },

    time: {
      type: String, // HH:mm from frontend
      required: true,
    },

    /* ================= LOCATION ================= */
    venue: {
      type: String,
      required: true,
      trim: true,
    },

    /* ================= EVENT DETAILS ================= */
    eventType: {
      type: String,
      enum: ["Seminar", "Workshop", "Hackathon", "Guest Lecture"],
      required: true,
    },

    mode: {
      type: String,
      enum: ["Offline", "Online", "Hybrid"],
      required: true,
    },

    /* ================= DEPARTMENT ================= */
    department: {
      type: String,
      required: true,
    },

    /* ================= ORGANIZERS ================= */
    organizers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    /* ================= REGISTRATION ================= */
    deadline: {
      type: Date,
    },

    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    registrationLink: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    /* ================= META ================= */
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    universityCode: {
      type: String,
      required: true,
      uppercase: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
