const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const RegisterRequest = require("../models/RegisterRequest");
const University = require("../models/University");
const User = require("../models/User");

const router = express.Router();

// 📩 Student/Teacher submits request
router.post("/register-request", async (req, res) => {
  try {
    const { name, email, password, role, universityCode, registrationCode } = req.body;

    const university = await University.findOne({ code: universityCode });
    if (!university) return res.status(404).json({ error: "Invalid university code" });

    // ✅ Verify registration code
    if (
      (role === "student" && registrationCode !== university.studentCode) ||
      (role === "teacher" && registrationCode !== university.teacherCode)
    ) {
      return res.status(400).json({ error: "Invalid registration code" });
    }

    // ✅ Check if already requested
    const existingReq = await RegisterRequest.findOne({ email });
    if (existingReq) return res.status(400).json({ error: "Request already exists" });

    // ✅ Create request
    const newReq = await RegisterRequest.create({
      name,
      email,
      password,
      role,
      universityCode,
      registrationCode,
    });

    // ✅ Send email to admin
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: university.email,
      subject: `New ${role} Registration Request`,
      html: `
        <h2>New ${role} Registration Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>University Code:</strong> ${universityCode}</p>
        <p>Please log in to your admin dashboard to approve or reject this request.</p>
      `,
    });

    res.status(201).json({ message: "Registration request submitted" });
  } catch (err) {
    console.error("Register Request Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
