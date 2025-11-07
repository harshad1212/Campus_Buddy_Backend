const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const transporter = require("../utils/mailer"); // ✅ only transporter

// --- Request Password Reset ---
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request - CampusBuddy",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #2b6cb0;">🔐 Password Reset Request</h2>
          <p>Hi ${user.name || "User"},</p>
          <p>We received a request to reset your password for your CampusBuddy account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" 
             style="background-color:#2b6cb0;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
             Reset Password
          </a>
          <p>If the button doesn’t work, copy and paste this link: <a href="${resetLink}">${resetLink}</a></p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `,
      text: `Reset your password using this link: ${resetLink}`
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

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Successful - CampusBuddy",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8f9fa;">
          <h2 style="color: #2b6cb0;">✅ Password Reset Successful</h2>
          <p>Hi ${user.name || "User"},</p>
          <p>Your password has been successfully reset.</p>
          <p>You can now log in using your new password.</p>
          <a href="${process.env.FRONTEND_URL}/login"
             style="background-color:#2b6cb0;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;">
             Go to Login
          </a>
          <p>If you didn’t request this change, please contact support immediately.</p>

          <p>— The CampusBuddy Team</p>
        </div>
      `,
      text: `Your password has been successfully reset. Login at ${process.env.FRONTEND_URL}/login`
    });

    res.json({ message: "Password reset successful! You can now log in." });
  } catch (err) {
    console.error("❌ Error in /reset:", err);
    res.status(500).json({ message: "Server error while resetting password." });
  }
});

module.exports = router;
