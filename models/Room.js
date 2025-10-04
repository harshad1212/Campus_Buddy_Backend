const mongoose = require("mongoose");
const { Schema } = mongoose;

const roomSchema = new Schema({
  name: String,
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  isGroup: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Room", roomSchema);
