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
        type: {
          type: String,
          enum: ["image", "video", "pdf", "word", "excel", "other"],
        },
        cloudinaryId: String, // Cloudinary public ID for deletion
      },
    ],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    favorites: [{ type: Schema.Types.ObjectId, ref: "User" }], // users who favorited this message
    forwarded: { type: Boolean, default: false }, // forwarded message flag
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" }, // reference to replied message

    // 🆕 Friend request system fields
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved", // normal messages are auto-approved
    },
    isFriendRequest: { type: Boolean, default: false }, // true if this is the first message to a non-friend
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
