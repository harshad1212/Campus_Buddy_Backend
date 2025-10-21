// server/models/Message.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    chat: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, trim: true },
    attachments: [
      {
        url: String,
        filename: String,
        type: { type: String, enum: ["image", "video", "pdf", "word", "excel", "other"] },
        cloudinaryId: String, // Cloudinary public ID for deletion
      },
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    favorites: [{ type: Schema.Types.ObjectId, ref: "User" }], // users who favorited this message
    forwarded: { type: Boolean, default: false }, // forwarded message flag
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" }, // ✅ reference to replied message
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
