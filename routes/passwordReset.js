const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const transporter = require("../utils/mailer"); // ✅ centralized transporter
const EmailTemplates = require("../utils/emailTemplates"); // ✅ reusable templates

// --- Request Password Reset ---
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔑 Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // 📧 Send reset link email
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request - CampusBuddy",
      html: EmailTemplates.passwordResetRequest(user.name, resetLink, user.universityName),
    });

    res.json({ message: "Password reset link sent successfully to your email." });
  } catch (err) {
    console.error("❌ Error in /forgot:", err);
    res.status(500).json({ message: "Server error while sending reset email." });
  }
});

// --- Verify Token & Reset Password ---
router.post("/reset/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // 🔍 Verify token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // 🔒 Update password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    // 📧 Send success email
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Successful - CampusBuddy",
      html: EmailTemplates.passwordResetSuccess(
        user.name,
        `${process.env.FRONTEND_URL}/login`,
        user.universityName
      ),
    });

    res.json({ message: "Password reset successful! You can now log in." });
  } catch (err) {
    console.error("❌ Error in /reset:", err);
    res.status(500).json({ message: "Server error while resetting password." });
  }
});

module.exports = router;
