const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const Resource = require("../models/Resource");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// 🔧 Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer setup for temporary local storage
const upload = multer({ dest: "uploads/resources" });

// ✅ Upload resource and preserve original file format + name
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, description, subject, stream, semester } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // 🧹 Clean and preserve filename with extension
    const ext = path.extname(file.originalname); // e.g. ".pptx"
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "_"); // remove spaces
    const cleanName = `${baseName}${ext}`; // e.g. "MyFile.pptx"

    // 🔥 Upload to Cloudinary (preserve extension)
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "resources_uploads",
      resource_type: "raw",
      public_id: cleanName, // keep same name
      use_filename: true,
      unique_filename: false,
      format: ext.substring(1), // ensure extension (pptx, pdf, etc.)
    });

    // 🧹 Delete temp file after upload
    fs.unlinkSync(file.path);

    // ✅ Save resource metadata in DB
    const newResource = new Resource({
      title,
      description,
      subject,
      stream,
      semester,
      fileUrl: result.secure_url, // Cloudinary file URL
      fileName: cleanName,
      fileType: file.mimetype,
      uploader: req.user._id,
    });

    await newResource.save();

    res.status(201).json({ message: "Resource uploaded successfully", resource: newResource });
  } catch (err) {
    console.error("❌ Upload Error:", err);
    res.status(500).json({ error: "Failed to upload resource" });
  }
});

// ✅ Get filtered resources
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { stream, semester, subject } = req.query;
    const filters = {};
    if (stream) filters.stream = stream.trim();
    if (semester) filters.semester = Number(semester);
    if (subject) filters.subject = subject.trim();

    const resources = await Resource.find(filters)
      .populate("uploader", "name email")
      .sort({ createdAt: -1 });

    res.json(resources);
  } catch (err) {
    console.error("❌ Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});


module.exports = router;
