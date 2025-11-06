// utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

// Verify transporter connection
transporter.verify((err, success) => {
  if (err) console.error("❌ Email transporter error:", err);
  else console.log("✅ Email transporter ready to send emails");
});

/**
 * sendEmail - A helper function to send emails easily
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    await transporter.sendMail({
      from: `"CampusBuddy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
}

module.exports = sendEmail;
