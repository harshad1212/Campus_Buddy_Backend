const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const RegisterRequest = require("../models/RegisterRequest");
const University = require("../models/University");
const transporter = require("../utils/mailer");
const EmailTemplates = require("../utils/emailTemplates");

const router = express.Router();

// 🖼️ Multer for temporary local file storage
const upload = multer({ dest: "uploads/" });

// ☁️ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 📩 Student/Teacher submits registration request
router.post("/register-request", upload.single("profilePhoto"), async (req, res) => {
  try {
    const { name, email, password, role, universityCode, registrationCode } = req.body;

    console.log("🔹 Registration request received for:", email);

    // 🔍 Find university
    const university = await University.findOne({ code: universityCode });
    if (!university)
      return res.status(404).json({ error: "Invalid university code" });

    // ✅ Verify registration code
    if (
      (role === "student" && registrationCode !== university.studentCode) ||
      (role === "teacher" && registrationCode !== university.teacherCode)
    ) {
      return res.status(400).json({ error: "Invalid registration code" });
    }

    // ✅ Prevent duplicate requests
    const existingReq = await RegisterRequest.findOne({ email });
    if (existingReq)
      return res.status(400).json({ error: "Request already exists" });

    // ✅ Upload photo to Cloudinary (if provided)
    let uploadedPhoto = null;
    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "campusbuddy_profiles",
      });
      uploadedPhoto = {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
      };
      fs.unlinkSync(req.file.path); // remove temp file
    }

    // ✅ Save registration request (no hashing yet)
    const newRequest = new RegisterRequest({
      name,
      email,
      password, // will be hashed after approval
      role,
      universityCode,
      registrationCode,
      profilePhoto: uploadedPhoto ? uploadedPhoto.url : null,
      cloudinaryId: uploadedPhoto ? uploadedPhoto.publicId : null,
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

    res.status(201).json({
      message: "Registration request submitted successfully.",
      request: newRequest,
    });
  } catch (err) {
    console.error("❌ Register Request Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
