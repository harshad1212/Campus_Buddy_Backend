const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    email: { type: String, required: true, lowercase: true, trim: true },

    password: { type: String, required: true },

    teacherCode: { type: String, required: true },
    studentCode: { type: String, required: true },

    departments: {
      type: [String],
      default: [],
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("University", universitySchema);
