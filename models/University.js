const mongoose = require("mongoose");

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // e.g. VIT, MIT
  email: { type: String, required: true },
  password: { type: String, required: true }, // hashed admin password
  logoUrl: { type: String, default: "" },
  domain: { type: String, default: "" },
  isApproved: { type: Boolean, default: false },
  teacherCode: { type: String, required: true },
  studentCode: { type: String, required: true },
  theme: {
    primaryColor: { type: String, default: "#2563eb" },
    secondaryColor: { type: String, default: "#1e3a8a" },
  },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  
},
{ timestamps: true });

module.exports = mongoose.model("University", universitySchema);
