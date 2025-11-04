const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const University = require("../models/University");
const User = require("../models/User");
const nodemailer = require("nodemailer");

// Middleware to allow only superadmin
function superAdminOnly(req, res, next) {
  if (req.user && req.user.role === "superadmin") return next();
  res.status(403).json({ error: "Access denied. Super Admin only." });
}

// 📌 GET all pending universities
router.get("/pending-universities", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const pending = await University.find({ isApproved: false }).populate("adminId", "name email");
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Approve a university
router.patch("/approve/:id", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const uni = await University.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).populate("adminId");

    // send email to admin
    await sendEmail(
      uni.adminId.email,
      "🎉 Campus Buddy Approval",
      `Hello ${uni.name} Admin,\n\nYour university has been approved! You can now log in and start using Campus Buddy.\n\nRegards,\nCampus Buddy Team`
    );

    res.json({ message: "University approved successfully!", university: uni });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📌 Reject a university
router.delete("/reject/:id", authMiddleware, superAdminOnly, async (req, res) => {
  try {
    const uni = await University.findById(req.params.id).populate("adminId");

    await sendEmail(
      uni.adminId.email,
      "Campus Buddy Registration Rejected",
      `Hello ${uni.name} Admin,\n\nUnfortunately, your registration was rejected. Please contact support.\n\nRegards,\nCampus Buddy Team`
    );

    await University.findByIdAndDelete(req.params.id);
    await User.findByIdAndDelete(uni.adminId._id);

    res.json({ message: "University rejected and deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📧 Email sender function (Nodemailer)
async function sendEmail(to, subject, text) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
  } catch (error) {
    console.error("Email failed:", error.message);
  }
}

module.exports = router;
