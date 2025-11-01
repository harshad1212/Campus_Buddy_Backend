const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const resourceSchema = new mongoose.Schema({
  title: String,
  description: String,
  stream: String,
  semester: Number,
  subject: String,
  fileUrl: String,
  fileName: String,
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  downloadCount: {
    type: Number,
    default: 0,
  }, // 👈 Add this line
  createdAt: { type: Date, default: Date.now },
  uploader: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
},

});

module.exports = mongoose.model("Resource", resourceSchema);
