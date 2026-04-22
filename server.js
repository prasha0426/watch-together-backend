const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

// ✅ Health check (important for Render)
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// 🔥 ROOM STORAGE (with Peer IDs)
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ✅ JOIN ROOM
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    // Add user with empty peerId first
    rooms[roomId].push({
      socketId: socket.id,
      peerId: null,
    });

    socket.roomId = roomId;

    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // 🎥 RECEIVE PEER ID
  socket.on("peer-id", ({ roomId, peerId }) => {
    const room = rooms[roomId];
    if (!room) return;

    // Update peerId for this user
    const user = room.find((u) => u.socketId === socket.id);
    if (user) {
      user.peerId = peerId;
    }

    // Send all valid peerIds to everyone
    const peerIds = room
      .map((u) => u.peerId)
      .filter((id) => id !== null);

    io.to(roomId).emit("all-peer-ids", peerIds);
  });

  // 💬 CHAT
  socket.on("chat-message", ({ roomId, message }) => {
    socket.to(roomId).emit("chat-message", message);
  });

  // 🎬 VIDEO SYNC
  socket.on("play", ({ roomId, time }) => {
    socket.to(roomId).emit("play", time);
  });

  socket.on("pause", (roomId) => {
    socket.to(roomId).emit("pause");
  });

  socket.on("seek", ({ roomId, time }) => {
    socket.to(roomId).emit("seek", time);
  });

  // ❌ DISCONNECT CLEANUP
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId] = rooms[roomId].filter(
      (u) => u.socketId !== socket.id
    );
  });
});

// ✅ PORT (Render compatible)
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
