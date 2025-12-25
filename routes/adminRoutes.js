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
// routes/admin.js
router.post("/approve-request/:id", async (req, res) => {
  try {
    const request = await RegisterRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // 🔐 Hash password now
    const hashedPassword = await bcrypt.hash(request.password, 10);

    // 🧠 Find university
    const university = await University.findOne({
      code: request.universityCode,
    });

    // ✅ CREATE USER FROM REQUEST
    const user = new User({
      role: request.role,
      name: request.name,
      email: request.email,
      password: hashedPassword,

      phone: request.phone,
      gender: request.gender,
      dob: request.dob,
      address: request.address,

      universityId: university?._id,
      universityCode: request.universityCode,
      department: request.department,
      course: request.course,
      semester: request.semester,

      enrollmentNumber: request.enrollmentNumber,
      employeeId: request.employeeId,
      designation: request.designation,

      avatarUrl: request.profilePhoto,
      avatarCloudId: request.cloudinaryId,

      isApproved: true,
    });

    await user.save();

    // ✅ Update request status
    request.status = "approved";
    await request.save();

    // 🗑️ Optional cleanup
    // await RegisterRequest.findByIdAndDelete(request._id);

    res.json({ message: "User approved & created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Approval failed" });
  }
});


/**
 * ❌ Reject registration request
 */
router.post("/reject-request/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const request = await RegisterRequest.findById(id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const university = await University.findOne({ code: request.universityCode });
    if (!university) return res.status(404).json({ error: "University not found" });

    // 🧹 Delete profile photo from Cloudinary (optional)
    if (request.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(request.cloudinaryId);
      } catch (err) {
        console.warn("⚠️ Cloudinary cleanup failed:", err.message);
      }
    }

    // 📧 Send rejection email
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: request.email,
      subject: "❌ Registration Rejected - CampusBuddy",
      html: EmailTemplates.registrationRejected(request.name, university.name),
    });

    await RegisterRequest.findByIdAndDelete(id);
    res.json({ message: "Request rejected and email sent successfully." });
  } catch (err) {
    console.error("❌ Error rejecting request:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
