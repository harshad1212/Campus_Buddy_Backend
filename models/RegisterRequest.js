// models/RegisterRequest.js
const mongoose = require("mongoose");

const RegisterRequestSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  universityCode: String,
  registrationCode: String,
  profilePhoto: String, // Cloudinary URL
  cloudinaryId: String, // Cloudinary public ID
  status: { type: String, default: "pending" },
},
{
    timestamps: true, // ✅ THIS adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("RegisterRequest", RegisterRequestSchema);
