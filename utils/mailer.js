const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // correct Gmail SMTP host
  port: 587,
  secure: false, // false for TLS
  auth: {
    user: process.env.EMAIL_USER, // your Gmail address
    pass: process.env.EMAIL_PASS, // your Gmail App Password
  },
});

transporter.verify((err, success) => {
  if (err) console.error("Email transporter error:", err);
  else console.log("✅ Email transporter ready to send emails");
});

module.exports = transporter;
