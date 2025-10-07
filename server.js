// server/server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const fs = require("fs");
const resourceRoutes = require("./routes/resourceRoutes");

// Add this line after `app.use(express.json());`
app.use("/api/resources", resourceRoutes);

// Serve uploaded files
app.use("/uploads/resources", express.static(path.join(__dirname, "uploads/resources")));

// Models
const User = require("./models/User");
const Room = require("./models/Room");
const Message = require("./models/Message");
const Resource = require("./models/Resource");

// App setup
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(bodyParser.json());

// Uploads dir
const upload = multer({ dest: path.join(__dirname, "uploads") });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- MONGOOSE CONNECT ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/campus-buddy";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// --- JWT Helpers ---
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
function signToken(user) {
  return jwt.sign({ id: user._id.toString(), name: user.name }, JWT_SECRET, { expiresIn: "1d" });
}
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// --- Start server & Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });
const chatNs = io.of("/chat");
app.use("/api/resources", resourceRoutes);

// Serve uploaded files
app.use("/uploads/resources", express.static(path.join(__dirname, "uploads/resources")));

// --- AUTH (Register/Login) ---
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
      role: "student",
    });
    await user.save();

    const token = signToken(user);
    res.json({ user, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid password" });

    const token = signToken(user);
    res.json({ user, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ROOMS ---
app.get("/api/rooms", authMiddleware, async (req, res) => {
  const allRooms = await Room.find().populate("members", "name avatarUrl");
  res.json(allRooms);
});

app.post("/api/rooms", authMiddleware, async (req, res) => {
  const { name, members = [] } = req.body;
  const uniqueMembers = Array.from(new Set([...members.map(String), req.user._id.toString()]));
  const room = new Room({ name, members: uniqueMembers, isGroup: true });
  await room.save();
  await room.populate("members", "name avatarUrl");
  chatNs.emit("room-upsert", room);
  res.json(room);
});

// --- PRIVATE CHAT ---
app.post("/api/private", authMiddleware, async (req, res) => {
  const { targetId } = req.body;
  let existing = await Room.findOne({
    isGroup: false,
    members: { $all: [req.user._id, targetId] },
  }).populate("members", "name avatarUrl");

  if (!existing) {
    const room = new Room({ members: [req.user._id, targetId], isGroup: false });
    await room.save();
    await room.populate("members", "name avatarUrl");
    chatNs.emit("room-upsert", room);
    existing = room;
  }
  res.json(existing);
});

// --- MESSAGES ---
app.get("/api/rooms/:roomId/messages", authMiddleware, async (req, res) => {
  const roomId = req.params.roomId;
  const msgs = await Message.find({ chat: roomId })
    .populate("sender", "name avatarUrl")
    .sort({ createdAt: 1 });
  res.json(msgs);
});

// --- FILE UPLOAD ---
app.post("/api/upload", authMiddleware, upload.array("files"), (req, res) => {
  const files = req.files.map((f) => ({
    url: `/uploads/${f.filename}`,
    filename: f.originalname,
    type: f.mimetype.startsWith("image/") ? "image" : "file",
  }));
  res.json(files);
});


// Create upload folder for resources
const resourcePath = path.join(__dirname, "uploads", "resources");
if (!fs.existsSync(resourcePath)) fs.mkdirSync(resourcePath, { recursive: true });

// Multer setup for resources
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, resourcePath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const resourceUpload = multer({ storage });

// 📤 Upload Resource
app.post("/api/resources/upload", authMiddleware, resourceUpload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const resource = new Resource({
      title: req.body.title || file.originalname,
      description: req.body.description,
      subject: req.body.subject,
      course: req.body.course,
      semester: req.body.semester,
      tags: req.body.tags ? req.body.tags.split(",").map(t => t.trim()) : [],
      fileUrl: `/uploads/resources/${file.filename}`,
      fileType: file.mimetype,
      fileName: file.originalname,
      uploader: req.user._id,
      approved: true, // You can change to false if you want admin approval
    });

    await resource.save();
    await resource.populate("uploader", "name avatarUrl");
    chatNs.emit("resource:created", resource);

    res.status(201).json(resource);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 📚 Get All Resources (Search, Filter)
app.get("/api/resources", authMiddleware, async (req, res) => {
  const { search, subject, course, semester } = req.query;
  const query = { approved: true };

  if (search) query.$text = { $search: search };
  if (subject) query.subject = subject;
  if (course) query.course = course;
  if (semester) query.semester = semester;

  const resources = await Resource.find(query).populate("uploader", "name avatarUrl").sort({ createdAt: -1 });
  res.json(resources);
});

// ❤️ Like / Unlike Resource
app.post("/api/resources/:id/like", authMiddleware, async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ error: "Resource not found" });

  const userId = req.user._id;
  const index = resource.likes.findIndex((id) => id.equals(userId));

  if (index >= 0) resource.likes.splice(index, 1);
  else resource.likes.push(userId);

  await resource.save();
  chatNs.emit("resource:like", { resourceId: resource._id.toString(), userId });

  res.json({ likes: resource.likes.length });
});

// 💬 Comment on Resource
app.post("/api/resources/:id/comment", authMiddleware, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Comment cannot be empty" });

  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ error: "Resource not found" });

  const comment = { user: req.user._id, text };
  resource.comments.push(comment);
  await resource.save();
  await resource.populate("comments.user", "name avatarUrl");
  chatNs.emit("resource:comment", { resourceId: resource._id.toString(), comment });

  res.json(resource.comments);
});

// 📥 Download Resource
app.get("/api/resources/:id/download", authMiddleware, async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return res.status(404).json({ error: "Resource not found" });

  resource.downloadCount += 1;
  await resource.save();

  res.redirect(resource.fileUrl);
});

// ======================================================
// 🚀 RESOURCES FEATURE ENDS HERE
// ======================================================


// --- SOCKET.IO SETUP ---
const onlineUsers = new Map();

chatNs.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return next(new Error("User not found"));
    socket.user = user;
    next();
  } catch (e) {
    next(new Error("Invalid token"));
  }
});

chatNs.on("connection", async (socket) => {
  const user = socket.user;
  const uid = user._id.toString();
  const set = onlineUsers.get(uid) || new Set();
  set.add(socket.id);
  onlineUsers.set(uid, set);

  chatNs.emit("presence", { userId: uid, online: true });

  const allUsers = await User.find();
  chatNs.emit(
    "user-list",
    allUsers.map((u) => ({
      _id: u._id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      online: onlineUsers.has(u._id.toString()),
    }))
  );

  socket.on("join-chat", (roomId) => socket.join(roomId));
  socket.on("leave-chat", (roomId) => socket.leave(roomId));

  socket.on("send-message", async (payload, ack) => {
    try {
      const { chatId, content, attachments, clientTempId } = payload;
      const msgDoc = new Message({
        chat: chatId,
        sender: user._id,
        content,
        attachments: attachments || [],
        readBy: [user._id],
      });
      await msgDoc.save();
      await msgDoc.populate("sender", "name avatarUrl");
      const msgToEmit = { ...msgDoc.toObject(), clientTempId };
      chatNs.to(chatId).emit("new-message", msgToEmit);
      if (ack) ack({ status: "ok", message: msgDoc });
    } catch (err) {
      if (ack) ack({ status: "error", error: err.message });
    }
  });

  socket.on("typing", ({ chatId, isTyping }) => {
    socket.to(chatId).emit("typing", { userId: uid, isTyping });
  });

  socket.on("message-read", async ({ chatId, messageId }) => {
    try {
      await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: user._id } });
      chatNs.to(chatId).emit("message-read", { messageId, userId: uid });
    } catch (e) {}
  });

  socket.on("disconnect", () => {
    const set = onlineUsers.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        onlineUsers.delete(uid);
        chatNs.emit("presence", { userId: uid, online: false });
      } else {
        onlineUsers.set(uid, set);
      }
    }
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
