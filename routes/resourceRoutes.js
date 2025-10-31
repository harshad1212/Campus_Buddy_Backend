const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const Resource = require("../models/Resource");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: "uploads/resources" });

// 📁 Upload Resource
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    const { title, description, subject, stream, semester } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/\s+/g, "_");
    const cleanName = `${baseName}${ext}`;

    const result = await cloudinary.uploader.upload(file.path, {
      folder: "resources_uploads",
      resource_type: "raw",
      public_id: cleanName,
      use_filename: true,
      unique_filename: false,
      format: ext.substring(1),
    });

    fs.unlinkSync(file.path);

    const newResource = new Resource({
      title,
      description,
      subject,
      stream,
      semester,
      fileUrl: result.secure_url,
      fileName: cleanName,
      fileType: file.mimetype,
      uploader: req.user._id,
      downloadCount: 0, // 🆕 Added
    });

    await newResource.save();
    res.status(201).json({ message: "Resource uploaded successfully", resource: newResource });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Failed to upload resource" });
  }
});

// 📚 Get Resources
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { stream, semester, subject } = req.query;
    const filters = {};
    if (stream) filters.stream = stream.trim();
    if (semester) filters.semester = Number(semester);
    if (subject) filters.subject = subject.trim();

    const resources = await Resource.find(filters)
      .populate("uploader", "name email")
      .populate("comments.user", "name")
      .sort({ createdAt: -1 });

    res.json(resources);
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

// ❤️ Like / Unlike
router.post("/:id/like", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    const userId = req.user.id;
    const alreadyLiked = resource.likes.includes(userId);

    if (alreadyLiked) resource.likes = resource.likes.filter((uid) => uid.toString() !== userId);
    else resource.likes.push(userId);

    await resource.save();

    res.json({
      liked: !alreadyLiked,
      likesCount: resource.likes.length,
    });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 💬 Add Comment
router.post("/:id/comment", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    resource.comments.push({
      user: req.user._id,
      text,
      createdAt: new Date(),
    });

    await resource.save();

    const populated = await Resource.findById(req.params.id).populate("comments.user", "name");
    const lastComment = populated.comments[populated.comments.length - 1];

    res.json(lastComment);
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 📥 Download Route (Increment Count)
router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: "Resource not found" });

    resource.downloadCount += 1;
    await resource.save();

    res.json({
      message: "Download count updated",
      fileUrl: resource.fileUrl,
      downloadCount: resource.downloadCount,
    });
  } catch (err) {
    console.error("Download error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
