const express = require("express");
const bcrypt = require("bcrypt");
const RegisterRequest = require("../models/RegisterRequest");
const User = require("../models/User");
const University = require("../models/University");
const transporter = require("../utils/mailer"); // ✅ only transporter

const router = express.Router();

/**
 * ✅ GET all pending registration requests for a university
 */
router.get("/pending-requests/:universityCode", async (req, res) => {
  try {
    const { universityCode } = req.params;
    if (!universityCode) return res.status(400).json({ error: "University code is required" });

    const requests = await RegisterRequest.find({ universityCode, status: "pending" });
    res.json(requests);
  } catch (err) {
    console.error("❌ Error fetching pending requests:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ POST approve registration request
 */
router.post("/approve-request/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RegisterRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const existingUser = await User.findOne({ email: request.email });
    if (existingUser) return res.status(400).json({ error: "User already registered" });

    const university = await University.findOne({ code: request.universityCode });
    if (!university) return res.status(404).json({ error: "University not found" });

    const hashedPassword = await bcrypt.hash(request.password, 10);
    const newUser = new User({
      name: request.name,
      email: request.email,
      password: hashedPassword,
      role: request.role,
      universityId: university._id,
      isApproved: true,
    });
    await newUser.save();
    await RegisterRequest.findByIdAndDelete(id);

    // Send approval email directly using transporter
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: request.email,
      subject: "🎉 Registration Approved - CampusBuddy",
      html: `
        <div style="font-family:Arial,sans-serif; padding:20px; border-radius:10px; background-color:#f9f9f9; border:1px solid #ddd;">
          <h2 style="color:#2b6cb0;">🎉 Registration Approved!</h2>
          <p>Hi <b>${request.name}</b>,</p>
          <p>Your registration as a <b>${request.role}</b> at <b>${university.name}</b> has been approved by the admin.</p>
          <p>You can now log in to your CampusBuddy account and start using our platform.</p>
          <a href="${process.env.FRONTEND_URL}/login"
             style="background-color:#2b6cb0;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
             Login Now
          </a>
          <p style="margin-top:20px; font-size:0.9em; color:#555;">Best regards,<br>CampusBuddy Team</p>
        </div>
      `,
      text: `Hello ${request.name}, your registration as ${request.role} at ${university.name} has been approved.`
    });

    res.json({ message: "User approved, request deleted, and email sent successfully" });
  } catch (err) {
    console.error("❌ Error approving request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ POST reject registration request
 */
router.post("/reject-request/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RegisterRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Send rejection email directly using transporter
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: request.email,
      subject: "❌ Registration Rejected - CampusBuddy",
      html: `
        <div style="font-family:Arial,sans-serif; padding:20px; border-radius:10px; background-color:#fff3f3; border:1px solid #f5c2c2;">
          <h2 style="color:#e53e3e;">❌ Registration Rejected</h2>
          <p>Hi <b>${request.name}</b>,</p>
          <p>We're sorry to inform you that your registration request was <b>rejected</b> by the university admin.</p>
          <p>If you believe this was a mistake, please contact your university admin.</p>
          <p style="margin-top:20px; font-size:0.9em; color:#555;">Best regards,<br>CampusBuddy Team</p>
        </div>
      `,
      text: `Hello ${request.name}, your registration request was rejected by the university admin.`
    });

    await RegisterRequest.findByIdAndDelete(id);
    res.json({ message: "Request rejected, deleted, and email sent successfully" });
  } catch (err) {
    console.error("❌ Error rejecting request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
