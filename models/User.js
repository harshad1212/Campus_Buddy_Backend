const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  resetToken: String,
  resetTokenExpiry: Date,
  avatarUrl: String,
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
