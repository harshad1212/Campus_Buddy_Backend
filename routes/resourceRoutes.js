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

// ✅ Get all resources uploaded by the logged-in user
router.get("/my", authMiddleware, async (req, res) => {
  try {
    // Use user ID from token or query parameter (fallback)
    const uploaderId = req.query.uploaderId || req.user.id;

    // Find all resources uploaded by this user
    const resources = await Resource.find({ uploader: uploaderId })
      .populate("uploader", "name email")
      .sort({ createdAt: -1 });

    if (!resources || resources.length === 0) {
        return res.status(200).json([]); // ✅ Return empty array instead of 404
      }
    res.status(200).json(resources);

    res.json(resources);
  } catch (err) {
    console.error("Error fetching user resources:", err);
    res.status(500).json({ message: "Server error while fetching user resources." });
  }
});

// ✅ Delete a resource by ID (only uploader can delete)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const resourceId = req.params.id;
    const userId = req.user.id;

    // Find the resource
    const resource = await Resource.findById(resourceId);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found." });
    }

    // Check if the logged-in user is the uploader
    if (resource.uploader.toString() !== userId) {
      return res.status(403).json({ message: "You are not authorized to delete this resource." });
    }

    // If resource has a Cloudinary file, remove it
    if (resource.fileUrl && resource.fileUrl.includes("cloudinary")) {
      try {
        const publicId = resource.fileUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudErr) {
        console.warn("Cloudinary delete warning:", cloudErr.message);
      }
    }

    // Delete the resource from MongoDB
    await Resource.findByIdAndDelete(resourceId);

    res.status(200).json({ message: "Resource deleted successfully." });
  } catch (err) {
    console.error("Error deleting resource:", err);
    res.status(500).json({ message: "Server error while deleting resource." });
  }
});


module.exports = router;
