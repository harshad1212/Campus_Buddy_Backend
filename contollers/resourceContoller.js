const Resource = require("../models/Resource");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.uploadResource = async (req, res) => {
  try {
    const { title, description, subject, stream, semester } = req.body;
    const uploaderId = req.user?._id; // comes from authMiddleware

    if (!req.file) {
      return res.status(400).json({ message: "File is required!" });
    }

    // Upload file to Cloudinary
    const uploadResult = await cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary error:", error);
          return res.status(500).json({ message: "Cloud upload failed" });
        }

        // Save to MongoDB
        const resource = new Resource({
          title,
          description,
          subject,
          stream,
          semester,
          fileUrl: result.secure_url,
          fileName: req.file.originalname,
          fileType: req.file.mimetype,
          uploader: uploaderId,
        });

        await resource.save();
        res.status(201).json({ message: "Resource uploaded", resource });
      }
    );

    // Pipe the file buffer to Cloudinary stream
    uploadResult.end(req.file.buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error while uploading resource" });
  }
};
