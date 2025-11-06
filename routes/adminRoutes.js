const express = require("express");
const bcrypt = require("bcrypt");
const RegisterRequest = require("../models/RegisterRequest");
const User = require("../models/User");
const University = require("../models/University");
const sendEmail = require("../utils/mailer");

const router = express.Router();

/**
 * ✅ GET all pending registration requests for a university
 */
router.get("/pending-requests/:universityCode", async (req, res) => {
  try {
    const { universityCode } = req.params;
    console.log("🔍 [DEBUG] Fetching requests for university:", universityCode);

    if (!universityCode) {
      return res.status(400).json({ error: "University code is required" });
    }

    const requests = await RegisterRequest.find({
      universityCode,
      status: "pending",
    });

    console.log("✅ [DEBUG] Found requests:", requests.length);
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

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email: request.email });
    if (existingUser)
      return res.status(400).json({ error: "User already registered" });

    // ✅ Find the university
    const university = await University.findOne({
      code: request.universityCode,
    });
    if (!university)
      return res.status(404).json({ error: "University not found" });

    // ✅ Hash password and create new user
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

    // ✅ Update request status
    request.status = "approved";
    request.isApproved = true;
    await request.save();

    // ✅ Send Approval Email
    const htmlTemplate = `
      <div style="font-family:Arial, sans-serif; padding:20px; border-radius:10px; background-color:#f9f9f9; border:1px solid #ddd;">
        <h2 style="color:#2b6cb0;">🎉 Registration Approved!</h2>
        <p>Hi <b>${request.name}</b>,</p>
        <p>Your registration as a <b>${request.role}</b> at <b>${university.name}</b> has been approved by the admin.</p>
        <p>You can now log in to your CampusBuddy account and start using our platform.</p>
        <a href="http://localhost:3000/login" style="background-color:#2b6cb0; color:white; padding:10px 20px; border-radius:5px; text-decoration:none;">Login Now</a>
        <p style="margin-top:20px; font-size:0.9em; color:#555;">Best regards,<br>CampusBuddy Team</p>
      </div>
    `;

    await sendEmail({
      to: request.email,
      subject: "🎉 Registration Approved - CampusBuddy",
      html: htmlTemplate,
      text: `Hello ${request.name}, your registration as ${request.role} at ${university.name} has been approved. You can now log in.`,
    });

    console.log("✅ Approved request and user registered:", request.email);
    res.json({ message: "User approved and email sent successfully" });
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

    request.status = "rejected";
    await request.save();

    // ✅ Send Rejection Email
    const htmlTemplate = `
      <div style="font-family:Arial, sans-serif; padding:20px; border-radius:10px; background-color:#fff3f3; border:1px solid #f5c2c2;">
        <h2 style="color:#e53e3e;">❌ Registration Rejected</h2>
        <p>Hi <b>${request.name}</b>,</p>
        <p>We're sorry to inform you that your registration request was <b>rejected</b> by the university admin.</p>
        <p>If you believe this was a mistake, please contact your university admin.</p>
        <p style="margin-top:20px; font-size:0.9em; color:#555;">Best regards,<br>CampusBuddy Team</p>
      </div>
    `;

    await sendEmail({
      to: request.email,
      subject: "❌ Registration Rejected - CampusBuddy",
      html: htmlTemplate,
      text: `Hello ${request.name}, your registration request was rejected by the university admin.`,
    });

    console.log("⚠️ Rejected request and email sent to:", request.email);
    res.json({ message: "Request rejected and email sent successfully" });
  } catch (err) {
    console.error("❌ Error rejecting request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
