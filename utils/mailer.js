// utils/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // Gmail SMTP host
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL_USER, // your Gmail
    pass: process.env.EMAIL_PASS, // your Gmail App Password (not account password)
  },
});

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Email transporter error:", err);
  } else {
    console.log("✅ Email transporter ready to send emails");
  }
});

module.exports = transporter;
