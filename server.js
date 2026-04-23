const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    rooms[roomId].push({
      socketId: socket.id,
      peerId: null,
    });

    socket.roomId = roomId;

    const peers = rooms[roomId]
      .map((u) => u.peerId)
      .filter((id) => id !== null);

    socket.emit("all-peer-ids", peers);
  });

  socket.on("peer-id", ({ roomId, peerId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const user = room.find((u) => u.socketId === socket.id);
    if (user) user.peerId = peerId;

    const peers = room
      .map((u) => u.peerId)
      .filter((id) => id !== null);

    io.to(roomId).emit("all-peer-ids", peers);
  });

  // 💬 CHAT
  socket.on("chat-message", ({ roomId, message }) => {
    socket.to(roomId).emit("chat-message", message);
  });

  // 🎬 SYNC
  socket.on("play", ({ roomId, time }) => {
    socket.to(roomId).emit("play", time);
  });

  socket.on("pause", (roomId) => {
    socket.to(roomId).emit("pause");
  });

  socket.on("seek", ({ roomId, time }) => {
    socket.to(roomId).emit("seek", time);
  });

  // 🎬 YOUTUBE
  socket.on("youtube-load", ({ roomId, videoId }) => {
    socket.to(roomId).emit("youtube-load", videoId);
  });

  socket.on("youtube-play", ({ roomId, time }) => {
    socket.to(roomId).emit("youtube-play", time);
  });

  socket.on("youtube-pause", (roomId) => {
    socket.to(roomId).emit("youtube-pause");
  });

  // 🔥 LEAVE ROOM
  socket.on("leave-room", () => {
    const roomId = socket.roomId;
    if (!roomId) return;

    socket.leave(roomId);

    if (rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(
        (u) => u.socketId !== socket.id
      );

      const peers = rooms[roomId]
        .map((u) => u.peerId)
        .filter((id) => id !== null);

      io.to(roomId).emit("all-peer-ids", peers);
    }

    socket.roomId = null;
  });

  socket.on("disconnect", () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;

    rooms[roomId] = rooms[roomId].filter(
      (u) => u.socketId !== socket.id
    );
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
