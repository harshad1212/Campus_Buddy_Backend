const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

const RegisterRequest = require("../models/RegisterRequest");
const University = require("../models/University");
const transporter = require("../utils/mailer");
const EmailTemplates = require("../utils/emailTemplates");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.post("/register-request", upload.single("profilePhoto"), async (req, res) => {
  try {
    console.log("📥 BODY:", req.body);

    const university = await University.findOne({ code: req.body.universityCode });
    if (!university) return res.status(404).json({ error: "Invalid university" });

    const exists = await RegisterRequest.findOne({ email: req.body.email });
    if (exists) return res.status(400).json({ error: "Request already exists" });

    let profilePhoto = null;
    let cloudinaryId = null;

    if (req.file) {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "campusbuddy/profile",
      });
      profilePhoto = uploadRes.secure_url;
      cloudinaryId = uploadRes.public_id;
      fs.unlinkSync(req.file.path);
    }

    const request = new RegisterRequest({
      ...req.body,
      semester: req.body.semester ? Number(req.body.semester) : null,
      profilePhoto,
      cloudinaryId,
    });

    await request.save();

    transporter.sendMail({
      to: university.email,
      subject: `📥 New ${req.body.role.toUpperCase()} Registration`,
      html: EmailTemplates.registrationRequested(
        req.body.name,
        req.body.role,
        university.name,
        `${process.env.FRONTEND_URL}/login`
      ),
    })
    .then(() => console.log("📧 Email sent"))
  .catch(err => console.warn("📧 Email skipped:", err.message));;

    res.status(201).json({ message: "Registration request submitted", request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
