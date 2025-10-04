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
// Models
const User = require("./models/User");
const Room = require("./models/Room");
const Message = require("./models/Message");

// App setup
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(bodyParser.json());

// Multer uploads dir
const upload = multer({ dest: path.join(__dirname, "uploads") });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- MONGOOSE CONNECT ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chat-app";
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("Connected to MongoDB"))
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

// --- Start server & Socket.IO early so we can emit from endpoints ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});
const chatNs = io.of("/chat");

// --- Auth (register/login) ---
app.post("/api/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      avatarUrl: `https://i.pravatar.cc/150?u=${email}` 
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


// --- Rooms ---
app.get("/api/rooms", authMiddleware, async (req, res) => {
  // returning all rooms (same as original mock). Change to filter by membership if desired.
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

// --- Private chat (find/create) ---
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

// --- Messages ---
app.get("/api/rooms/:roomId/messages", authMiddleware, async (req, res) => {
  const roomId = req.params.roomId;
  const msgs = await Message.find({ chat: roomId })
    .populate("sender", "name avatarUrl")
    .sort({ createdAt: 1 });
  res.json(msgs);
});

// --- File Upload stub ---
app.post("/api/upload", authMiddleware, upload.array("files"), (req, res) => {
  const files = req.files.map((f) => ({
    url: `/uploads/${f.filename}`,
    filename: f.originalname,
    type: f.mimetype.startsWith("image/") ? "image" : "file",
  }));
  res.json(files);
});

// --- Socket.IO Setup ---
const onlineUsers = new Map(); // userId -> Set of socketIds

chatNs.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return next(new Error("User not found"));
    socket.user = user;
    return next();
  } catch (e) {
    return next(new Error("Invalid token"));
  }
});

chatNs.on("connection", async (socket) => {
  const user = socket.user;
  const uid = user._id.toString();

  // multiple sockets per user supported
  const set = onlineUsers.get(uid) || new Set();
  set.add(socket.id);
  onlineUsers.set(uid, set);

  // broadcast presence (online)
  chatNs.emit("presence", { userId: uid, online: true });

  // send updated user list
  const allUsers = await User.find();
  chatNs.emit("user-list", allUsers.map((u) => ({
    _id: u._id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    online: onlineUsers.has(u._id.toString()),
  })));

  socket.on("join-chat", (roomId) => {
    socket.join(roomId);
  });

  socket.on("leave-chat", (roomId) => {
    socket.leave(roomId);
  });

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
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { readBy: user._id } },
        { new: true }
      );
      if (updated) {
        chatNs.to(chatId).emit("message-read", { messageId, userId: uid });
      }
    } catch (e) {
      // ignore
    }
  });

  socket.on("disconnect", () => {
    // remove socket id
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

// --- Start ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Chat server running on port ${PORT}`));
