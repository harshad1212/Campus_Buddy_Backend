const mongoose = require("mongoose");

const registerRequestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "teacher"], required: true },
    universityCode: { type: String, required: true },
    registrationCode: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RegisterRequest", registerRequestSchema);
