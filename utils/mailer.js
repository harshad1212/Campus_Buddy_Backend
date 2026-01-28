// utils/mailer.js
const nodemailer = require("nodemailer");

// Single transporter instance
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000, // 10 sec
  greetingTimeout: 10000,
  socketTimeout: 10000
});

// Verify connection
transporter.verify((err, success) => {
  if (err) console.error("❌ Email transporter error:", err);
  else console.log("✅ Email transporter ready");
});

module.exports = transporter;
