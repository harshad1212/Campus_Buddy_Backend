// utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // ✅ more stable on Render than host/port
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Non-blocking verify (IMPORTANT)
transporter.verify()
  .then(() => console.log("✅ Email transporter ready"))
  .catch(err => console.warn("⚠️ Email transporter warning:", err.message));

module.exports = transporter;
