const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const RegisterRequest = require("../models/RegisterRequest");
const User = require("../models/User");
const University = require("../models/University");
const transporter = require("../utils/mailer");
const EmailTemplates = require("../utils/emailTemplates");

const router = express.Router();

// 🖼️ Multer for profile photo
const upload = multer({ dest: "uploads/" });

// 📩 Student/Teacher submits registration request
router.post("/register-request", upload.single("profilePhoto"), async (req, res) => {
  try {
    const { name, email, password, role, universityCode, registrationCode } = req.body;

    console.log("🔹 Registration request received for:", email);
    console.log("🔹 Password received (plain):", password);

    // 🔍 Find university
    const university = await University.findOne({ code: universityCode });
    if (!university) return res.status(404).json({ error: "Invalid university code" });

    // ✅ Verify registration code
    if (
      (role === "student" && registrationCode !== university.studentCode) ||
      (role === "teacher" && registrationCode !== university.teacherCode)
    ) {
      return res.status(400).json({ error: "Invalid registration code" });
    }

    // ✅ Prevent duplicate requests
    const existingReq = await RegisterRequest.findOne({ email });
    if (existingReq) return res.status(400).json({ error: "Request already exists" });

    // ✅ Save registration request (no hashing here)
    const newRequest = new RegisterRequest({
      name,
      email,
      password, // ⚠️ plain, will be hashed later
      role,
      universityCode,
      registrationCode,
      profilePhoto: req.file ? req.file.path : null,
    });

    await newRequest.save();

    // 📧 Notify the university admin via email
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: university.email,
      subject: `📥 New ${role} Registration Request`,
      html: EmailTemplates.registrationRequested(
        name,
        role,
        university.name,
        `${process.env.FRONTEND_URL}/login`
      ),
    });

    res.status(201).json({ message: "Registration request submitted successfully." });
  } catch (err) {
    console.error("❌ Register Request Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ GET all pending registration requests for a university




module.exports = router;
