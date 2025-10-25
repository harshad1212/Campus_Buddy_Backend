const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  subject: { type: String, required: true },
  stream: { type: String, required: true },
  semester: { type: Number, required: true },
  tags: [String],
  fileUrl: { type: String, required: true },
  fileName: { type: String },
  fileType: { type: String },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      text: String,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  downloadCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Resource", resourceSchema);
