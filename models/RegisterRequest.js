const mongoose = require("mongoose");

const RegisterRequestSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },

    // Personal
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },

    phone: String,
    gender: String,
    dob: Date,

    // Academic
    universityCode: String,
    department: String,
    semester: Number,

    registrationCode: String,

    // Student
    enrollmentNumber: String,

    // Teacher
    employeeId: String,
    designation: String,

    // Media
    profilePhoto: String,
    cloudinaryId: String,

    status: { type: String, default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RegisterRequest", RegisterRequestSchema);
