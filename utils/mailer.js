// utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // must be false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
  connectionTimeout: 10000, // 10 sec
  greetingTimeout: 10000,
  socketTimeout: 10000,
}); 

// Non-blocking verify (IMPORTANT)
transporter.verify()
  .then(() => console.log("✅ Email transporter ready"))
  .catch(err => console.warn("⚠️ Email transporter warning:", err.message));

module.exports = transporter;
