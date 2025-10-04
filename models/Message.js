const mongoose = require("mongoose");
const { Schema } = mongoose;

const attachmentSchema = new Schema({
  url: String,
  filename: String,
  type: String,
}, { _id: false });

const messageSchema = new Schema({
  chat: { type: Schema.Types.ObjectId, ref: "Room", required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: String,
  attachments: [attachmentSchema],
  readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
