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
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

// Models
const User = require("./models/User");
const Room = require("./models/Room");
const Message = require("./models/Message");

// App setup
const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(bodyParser.json());
app.use(morgan("dev"));

// Rate limiter
app.use(
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 200, // limit each IP
  })
);

// Multer uploads dir
const upload = multer({ dest: path.join(__dirname, "uploads") });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- MONGOOSE CONNECT ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chat-app";
mongoose
  .connect(MONGO_URI, {
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
      avatarUrl: `https://i.pravatar.cc/150?u=${email}`,
    });
    await user.save();

    const token = signToken(user);
    console.log(token);
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

// --- Users endpoint (initial sidebar data) ---
app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select("name avatarUrl email");
    // onlineUsers map is defined in socket block; we'll attach a helper to the namespace object later
    const onlineUsersMap = chatNs.onlineUsersMap || new Map();
    const list = users.map((u) => ({
      _id: u._id,
      name: u.name,
      avatarUrl: u.avatarUrl,
      online: onlineUsersMap.has(u._id.toString()),
    }));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Rooms ---
app.get("/api/rooms", authMiddleware, async (req, res) => {
  // returning all rooms (change to filter by membership if desired)
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
  const { roomId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(roomId)) {
    return res.status(400).json({ error: "Invalid chat ID" });
  }

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
/**
 * onlineUsers: Map<userId, Set<socketId>>
 * We'll expose it as chatNs.onlineUsersMap for REST handlers (read-only usage).
 */
const onlineUsers = new Map();
chatNs.onlineUsersMap = onlineUsers;

// typing timers per-socket to debounce typing notifications
const typingTimers = new Map();

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

// helper: compute unread messages count for a specific user
async function computeUnreadCountsForUser(userId) {
  // return a map userId -> count of unread messages from that user (in private rooms)
  const users = await User.find({ _id: { $ne: userId } }).select("_id");
  const result = new Map();
  // For each other user, find private room and count unread from that user
  await Promise.all(
    users.map(async (u) => {
      const privateRoom = await Room.findOne({
        isGroup: false,
        members: { $all: [userId, u._id] },
      }).select("_id");
      if (!privateRoom) {
        result.set(u._id.toString(), 0);
        return;
      }
      const count = await Message.countDocuments({
        chat: privateRoom._id,
        sender: u._id,
        readBy: { $ne: userId },
      });
      result.set(u._id.toString(), count);
    })
  );
  return result;
}

// helper: emit light user list to everyone (no unread counts)
async function emitLightUserList() {
  const users = await User.find().select("name avatarUrl");
  const list = users.map((u) => ({
    _id: u._id,
    name: u.name,
    avatarUrl: u.avatarUrl,
    online: onlineUsers.has(u._id.toString()),
  }));
  chatNs.emit("user-list", list);
}

// helper: when presence changes, update others with presence and light user list
async function broadcastPresenceChange(userId, online) {
  // broadcast presence to all other sockets
  chatNs.emit("presence", { userId, online });
  // re-emit light user-list so front-ends can update online flags more easily
  await emitLightUserList();
}

chatNs.on("connection", async (socket) => {
  const user = socket.user;
  const uid = user._id.toString();

  // multiple sockets per user supported
  const set = onlineUsers.get(uid) || new Set();
  set.add(socket.id);
  onlineUsers.set(uid, set);

  // Notify others (broadcast) that this user is online
  socket.broadcast.emit("presence", { userId: uid, online: true });
  // also emit an updated light user list to everyone (so their online flags update)
  await emitLightUserList();

  // Send personalized user list (including unread counts) only to this socket
  try {
    const allUsers = await User.find({}).select("name avatarUrl");
    const unreadMap = await computeUnreadCountsForUser(uid);
    const personalized = allUsers
      .filter((u) => u._id.toString() !== uid)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        avatarUrl: u.avatarUrl,
        online: onlineUsers.has(u._id.toString()),
        unreadCount: unreadMap.get(u._id.toString()) || 0,
      }));
    socket.emit("user-list", personalized);
  } catch (err) {
    console.error("Error preparing personalized user-list:", err);
  }

  // Send list of rooms if desired (optional)
  // const rooms = await Room.find({ members: uid }).populate('members', 'name avatarUrl');
  // socket.emit('rooms', rooms);

  // Socket event handlers
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
        readBy: [user._id], // sender has 'read' it
      });
      await msgDoc.save();
      await msgDoc.populate("sender", "name avatarUrl");

      const msgToEmit = { ...msgDoc.toObject(), clientTempId };
      // emit to room
      chatNs.to(chatId).emit("new-message", msgToEmit);

      // After saving message, update unread counts for members (exclude sender)
      try {
        const room = await Room.findById(chatId);
        if (room) {
          const members = room.members.map((m) => m.toString());
          const affectedMembers = members.filter((m) => m !== uid);
          // For each affected member, compute their unread messages from the sender or total unread for that chat
          for (const memberId of affectedMembers) {
            // Count unread messages in this chat for that member
            const unreadCount = await Message.countDocuments({
              chat: chatId,
              readBy: { $ne: memberId },
            });
            // Emit a targeted unread update for that member
            const sockets = onlineUsers.get(memberId);
            if (sockets && sockets.size > 0) {
              for (const sid of sockets) {
                chatNs.to(sid).emit("user-unread", {
                  userId: memberId,
                  chatId,
                  unreadCount,
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to compute per-member unread counts:", e.message || e);
      }

      if (ack) ack({ status: "ok", message: msgDoc });
    } catch (err) {
      console.error("send-message error:", err);
      if (ack) ack({ status: "error", error: err.message });
    }
  });

  // typing with debounce to avoid spam
  socket.on("typing", ({ chatId, isTyping }) => {
    // broadcast to other participants in chat
    socket.to(chatId).emit("typing", { userId: uid, isTyping });

    // ensure typing auto-clears after 3s if not updated
    if (isTyping) {
      clearTimeout(typingTimers.get(socket.id));
      const t = setTimeout(() => {
        socket.to(chatId).emit("typing", { userId: uid, isTyping: false });
        typingTimers.delete(socket.id);
      }, 3000);
      typingTimers.set(socket.id, t);
    } else {
      clearTimeout(typingTimers.get(socket.id));
      typingTimers.delete(socket.id);
    }
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

        // Optionally update unread counts for room members
        try {
          const unreadCount = await Message.countDocuments({
            chat: chatId,
            readBy: { $ne: uid },
          });
          const sockets = onlineUsers.get(uid);
          if (sockets && sockets.size > 0) {
            for (const sid of sockets) {
              chatNs.to(sid).emit("user-unread", {
                userId: uid,
                chatId,
                unreadCount,
              });
            }
          }
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }
  });

  socket.on("disconnect", async () => {
    // remove socket id
    const set = onlineUsers.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        onlineUsers.delete(uid);
        // broadcast offline presence
        socket.broadcast.emit("presence", { userId: uid, online: false });
        // re-emit light user list
        await emitLightUserList();
      } else {
        onlineUsers.set(uid, set);
      }
    }
    // cleanup typing timer if any
    clearTimeout(typingTimers.get(socket.id));
    typingTimers.delete(socket.id);
  });
});

// --- Start ---
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Chat server running on port ${PORT}`));
