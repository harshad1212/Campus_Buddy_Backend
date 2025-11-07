const express = require("express");
const bcrypt = require("bcrypt");
const RegisterRequest = require("../models/RegisterRequest");
const User = require("../models/User");
const University = require("../models/University");
const transporter = require("../utils/mailer"); // ✅ only transporter
const EmailTemplates = require("../utils/emailTemplates"); // ✅ reusable templates

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

    // ✅ Send approval email
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: request.email,
      subject: "🎉 Registration Approved - CampusBuddy",
      html: EmailTemplates.registrationApproved(
        request.name,
        request.role,
        university.name,
        `${process.env.FRONTEND_URL}/login`
      ),
    });

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

    const university = await University.findOne({ code: request.universityCode });
    if (!university) return res.status(404).json({ error: "University not found" });

    // ✅ Send rejection email
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: request.email,
      subject: "❌ Registration Rejected - CampusBuddy",
      html: EmailTemplates.registrationRejected(request.name, university.name),
    });

    await RegisterRequest.findByIdAndDelete(id);
    res.json({ message: "Request rejected and email sent successfully" });
  } catch (err) {
    console.error("❌ Error rejecting request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
